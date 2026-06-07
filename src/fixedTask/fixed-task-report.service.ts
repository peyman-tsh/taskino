import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from '../task/task.schema';
import {
  IncompleteFixedTaskDeadlineStatus,
  QueryIncompleteFixedTaskReportDto,
} from './dto/query-incomplete-fixed-task-report.dto';
import {
  FixedTaskRecurrence,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
} from './fixed-task.schema';

@Injectable()
export class FixedTaskReportService {
  constructor(
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  private toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return new Types.ObjectId(id);
  }

  private getReportPeriod(recurrence: FixedTaskRecurrence, periodAt: Date) {
    const periodStart = new Date(periodAt);
    const periodEnd = new Date(periodAt);

    if (recurrence === FixedTaskRecurrence.DAILY) {
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (recurrence === FixedTaskRecurrence.WEEKLY) {
      const daysSinceSaturday = (periodAt.getDay() + 1) % 7;
      periodStart.setDate(periodAt.getDate() - daysSinceSaturday);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setTime(periodStart.getTime());
      periodEnd.setDate(periodStart.getDate() + 5);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth(periodStart.getMonth() + 1, 0);
      periodEnd.setHours(23, 59, 59, 999);
    }

    return { periodStart, periodEnd };
  }

  async getIncompleteReport(
    managerId: string,
    queryDto: QueryIncompleteFixedTaskReportDto,
  ) {
    const reportAt = queryDto.reportAt
      ? new Date(queryDto.reportAt)
      : new Date();
    const periodAt = queryDto.periodAt ? new Date(queryDto.periodAt) : reportAt;
    const query: Record<string, unknown> = {
      createdBy: this.toObjectId(managerId, 'manager user ID'),
      isActive: true,
    };

    if (queryDto.recurrence) query.recurrence = queryDto.recurrence;
    if (queryDto.assignedTo) {
      query.assignedTo = this.toObjectId(
        queryDto.assignedTo,
        'assigned user ID',
      );
    }
    if (queryDto.projectId) {
      query.projectId = this.toObjectId(queryDto.projectId, 'project ID');
    }

    const templates = await this.fixedTaskModel
      .find(query)
      .populate(
        'assignedTo',
        'firstName lastName email mobile roles workField isActive',
      )
      .populate('projectId', 'title status workField isArchived')
      .lean()
      .exec();
    const tasks = templates.length
      ? await this.taskModel
          .find({
            fixedTaskTemplateId: {
              $in: templates.map((template) => template._id),
            },
          })
          .populate('assignedTo', 'firstName lastName email')
          .populate('projectId', 'title status')
          .lean()
          .exec()
      : [];

    const tasksByTemplateId = new Map<string, typeof tasks>();
    tasks.forEach((task) => {
      const templateId = task.fixedTaskTemplateId?.toString();
      if (!templateId) return;
      const templateTasks = tasksByTemplateId.get(templateId) ?? [];
      templateTasks.push(task);
      tasksByTemplateId.set(templateId, templateTasks);
    });

    const report = templates.flatMap((template) => {
      const { periodStart, periodEnd } = this.getReportPeriod(
        template.recurrence,
        periodAt,
      );
      const periodTasks = (
        tasksByTemplateId.get(template._id.toString()) ?? []
      ).filter((task) => {
        const taskDate =
          task.startDate ??
          (task as typeof task & { createdAt: Date }).createdAt;
        return taskDate >= periodStart && taskDate <= periodEnd;
      });
      if (periodTasks.some((task) => task.status === TaskStatus.DONE))
        return [];

      const taskDeadlines = periodTasks.flatMap((task) =>
        task.dueDate ? [task.dueDate] : [],
      );
      const deadline = taskDeadlines.length
        ? new Date(
            Math.max(
              ...taskDeadlines.map((taskDeadline) => taskDeadline.getTime()),
            ),
          )
        : periodEnd;
      const deadlineStatus =
        reportAt > deadline
          ? IncompleteFixedTaskDeadlineStatus.OVERDUE
          : IncompleteFixedTaskDeadlineStatus.WITHIN_DEADLINE;

      if (queryDto.deadlineStatus && queryDto.deadlineStatus !== deadlineStatus)
        return [];

      return [
        {
          templateId: template._id.toString(),
          title: template.title,
          recurrence: template.recurrence,
          assignedTo: template.assignedTo,
          project: template.projectId,
          periodStart,
          deadline,
          deadlineStatus,
          generatedTasks: periodTasks,
        },
      ];
    });

    const skip = (queryDto.page - 1) * queryDto.limit;
    return {
      reportAt,
      periodAt,
      data: report.slice(skip, skip + queryDto.limit),
      total: report.length,
      overdue: report.filter(
        (item) =>
          item.deadlineStatus === IncompleteFixedTaskDeadlineStatus.OVERDUE,
      ).length,
      withinDeadline: report.filter(
        (item) =>
          item.deadlineStatus ===
          IncompleteFixedTaskDeadlineStatus.WITHIN_DEADLINE,
      ).length,
      page: queryDto.page,
      limit: queryDto.limit,
    };
  }
}
