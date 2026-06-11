import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskStatus,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
} from '../../fixedTask/fixed-task.schema';
import {
  Task,
  TaskDocument,
  TaskRecurrence,
  TaskStatus,
} from '../../task/task.schema';
import {
  SupervisorFixedTasksQueryDto,
  SupervisorTasksQueryDto,
} from '../dto/supervisor-query.dto';

@Injectable()
export class SupervisorWorkRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
  ) {}

  countSupervisedTasks(supervisorId: Types.ObjectId, recurrence?: TaskRecurrence) {
    return this.taskModel
      .countDocuments(this.taskFilter({ createdBy: supervisorId }, recurrence))
      .exec();
  }

  countSupervisedFixedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.fixedTaskModel
      .countDocuments(this.fixedTaskFilter({ createdBy: supervisorId }, recurrence))
      .exec();
  }

  countSupervisedInProgressTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.taskModel
      .countDocuments(
        this.taskFilter(
          { createdBy: supervisorId, status: TaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countSupervisedInProgressFixedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.fixedTaskModel
      .countDocuments(
        this.fixedTaskFilter(
          { createdBy: supervisorId, status: FixedTaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countMyInProgressTasks(supervisorId: Types.ObjectId, recurrence?: TaskRecurrence) {
    return this.taskModel
      .countDocuments(
        this.taskFilter(
          { assignedTo: supervisorId, status: TaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countMyInProgressFixedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.fixedTaskModel
      .countDocuments(
        this.fixedTaskFilter(
          { assignedTo: supervisorId, status: FixedTaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countMySuccessfulTasks(supervisorId: Types.ObjectId, recurrence?: TaskRecurrence) {
    return this.taskModel
      .countDocuments(
        this.taskFilter(
          { assignedTo: supervisorId, status: TaskStatus.DONE },
          recurrence,
        ),
      )
      .exec();
  }

  countMyOnTimeSuccessfulTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.taskModel
      .countDocuments(
        this.taskFilter(
          {
            assignedTo: supervisorId,
            status: TaskStatus.DONE,
            doneTime: { $type: 'date' },
            dueDate: { $type: 'date' },
            $expr: { $lt: ['$doneTime', '$dueDate'] },
          },
          recurrence,
        ),
      )
      .exec();
  }

  async findSupervisedTasks(
    supervisorId: Types.ObjectId,
    query: SupervisorTasksQueryDto,
  ) {
    const filter = this.taskFilter(
      {
        createdBy: supervisorId,
        ...(query.status ? { status: query.status } : {}),
      },
      query.recurrence,
    );
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('assignedTo', 'firstName lastName email roles workField')
        .populate('excelFile', 'fileName originalName status type')
        .exec(),
      this.taskModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  async findSupervisedFixedTasks(
    supervisorId: Types.ObjectId,
    query: SupervisorFixedTasksQueryDto,
  ) {
    const filter = this.fixedTaskFilter(
      {
        createdBy: supervisorId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      query.recurrence,
    );
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.fixedTaskModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .populate('assignedTo', 'firstName lastName email roles workField')
        .exec(),
      this.fixedTaskModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  private taskFilter(
    base: Record<string, unknown>,
    recurrence?: TaskRecurrence,
  ): Record<string, unknown> {
    return recurrence ? { ...base, recurrence } : base;
  }

  private fixedTaskFilter(
    base: Record<string, unknown>,
    recurrence?: TaskRecurrence,
  ): Record<string, unknown> {
    return recurrence ? { ...base, recurrence } : base;
  }
}
