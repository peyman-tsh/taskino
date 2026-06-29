import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../../fixedTask/fixed-task.schema';
import { Task, TaskDocument, TaskStatus } from '../../task/task.schema';
import { WorkStatusItem } from '../types/work-status-range.types';
import { WorkStatusUserItem } from '../types/work-status-range.types';

@Injectable()
export class ManagerWorkStatusRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
  ) {}

  async findByDateRange(
    from: Date,
    to: Date,
    _managerId: string,
  ): Promise<{
    tasks: WorkStatusItem[];
    fixedTasks: WorkStatusItem[];
  }> {
    const taskFilter = this.buildTaskDateFilter(from, to);
    const fixedTaskDateFilter = this.buildFixedTaskDateFilter(from, to);
    const fixedTaskFilter = {
      $and: [
        fixedTaskDateFilter,
        { timingApprovalStatus: { $ne: FixedTaskTimingApprovalStatus.REJECTED } },
      ],
    };
    const [tasks, fixedTasks] = await Promise.all([
      this.taskModel
        .find(taskFilter)
        .select('status startDate dueDate endDate endTime')
        .lean()
        .exec(),
      this.fixedTaskModel
        .find(fixedTaskFilter)
        .select('status startDate endDate endTime')
        .lean()
        .exec(),
    ]);

    return {
      tasks: tasks as WorkStatusItem[],
      fixedTasks: fixedTasks as WorkStatusItem[],
    };
  }

  async findByDateRangeForUsers(
    from: Date,
    to: Date,
    managerId: string,
    userId?: string,
  ): Promise<{
    tasks: WorkStatusUserItem[];
    fixedTasks: WorkStatusUserItem[];
  }> {
    const taskFilter = this.buildTaskFilter(
      this.buildTaskDateFilter(from, to),
      userId,
    );
    const fixedTaskFilter = this.buildFixedTaskFilter(
      this.buildFixedTaskDateFilter(from, to),
      managerId,
      userId,
    );

    const [tasks, fixedTasks] = await Promise.all([
      this.taskModel
        .find(taskFilter)
        .select('status startDate dueDate endDate endTime assignedTo')
        .populate('assignedTo', 'firstName lastName email')
        .lean()
        .exec(),
      this.fixedTaskModel
        .find(fixedTaskFilter)
        .select('status startDate endDate endTime assignedTo isActive')
        .populate('assignedTo', 'firstName lastName email')
        .lean()
        .exec(),
    ]);

    return {
      tasks: this.mapTasksToUserItems(tasks),
      fixedTasks: this.mapFixedTasksToUserItems(fixedTasks),
    };
  }

  async findOverdueFixedTasks(
    from: Date,
    to: Date,
    evaluatedAt: Date,
    userId?: string,
  ) {
    const filter = this.buildFixedTaskDocumentFilter(
      {
        status: {
          $in: [FixedTaskStatus.TODO, FixedTaskStatus.IN_PROGRESS],
        },
        isActive: false,
        startDate: {
          $gte: from,
        },
        endDate: {
          $lte: to,
          $lt: evaluatedAt,
        },
      },
      userId,
    );

    return this.fixedTaskModel
      .find(filter)
      .populate('assignedTo', 'firstName lastName email mobile roles workField isActive')
      .populate('createdBy', 'firstName lastName email roles workField')
      .populate('timingApprovedBy', 'firstName lastName email roles')
      .sort({ endDate: 1, startDate: 1, _id: 1 })
      .lean()
      .exec();
  }

  async findDoneFixedTasks(from: Date, to: Date, userId?: string) {
    const filter = this.buildFixedTaskDocumentFilter(
      {
        status: FixedTaskStatus.DONE,
        startDate: {
          $gte: from,
        },
        endDate: {
          $lte: to,
        },
      },
      userId,
    );

    return this.fixedTaskModel
      .find(filter)
      .populate('assignedTo', 'firstName lastName email mobile roles workField isActive')
      .populate('createdBy', 'firstName lastName email roles workField')
      .populate('timingApprovedBy', 'firstName lastName email roles')
      .sort({ endDate: 1, startDate: 1, _id: 1 })
      .lean()
      .exec();
  }

  private buildTaskDateFilter(from: Date, to: Date) {
    return {
      $or: [
        { status: TaskStatus.IN_PROGRESS },
        {
          startDate: { $lte: to },
          endDate: { $gte: from },
        },
        {
          startDate: { $lte: to },
          dueDate: { $gte: from },
        },
        { startDate: { $gte: from, $lte: to } },
        { endDate: { $gte: from, $lte: to } },
        { dueDate: { $gte: from, $lte: to } },
        {
          startDate: null,
          createdAt: { $gte: from, $lte: to },
        },
      ],
    };
  }

  private buildFixedTaskDateFilter(from: Date, to: Date) {
    return {
      $or: [
        { status: FixedTaskStatus.IN_PROGRESS, isActive: true },
        { status: FixedTaskStatus.TODO, isActive: true },
        {
          startDate: { $lte: to },
          endDate: { $gte: from },
        },
        { startDate: { $gte: from, $lte: to } },
        { endDate: { $gte: from, $lte: to } },
        {
          startDate: null,
          createdAt: { $gte: from, $lte: to },
        },
      ],
    };
  }

  private buildTaskFilter(
    dateFilter: Record<string, unknown>,
    userId?: string,
  ) {
    if (!userId) return dateFilter;

    return {
      $and: [
        dateFilter,
        { assignedTo: new Types.ObjectId(userId) },
      ],
    };
  }

  private buildFixedTaskFilter(
    dateFilter: Record<string, unknown>,
    _managerId: string,
    userId?: string,
  ) {
    const filters: Record<string, unknown>[] = [
      dateFilter,
      { timingApprovalStatus: { $ne: FixedTaskTimingApprovalStatus.REJECTED } },
    ];

    if (userId) {
      filters.push({ assignedTo: new Types.ObjectId(userId) });
    }

    return {
      $and: [
        ...filters,
      ],
    };
  }

  private buildFixedTaskDocumentFilter(
    filter: Record<string, unknown>,
    userId?: string,
  ) {
    const filters: Record<string, unknown>[] = [
      filter,
      { timingApprovalStatus: { $ne: FixedTaskTimingApprovalStatus.REJECTED } },
    ];

    if (userId) {
      filters.push({ assignedTo: new Types.ObjectId(userId) });
    }

    return { $and: filters };
  }

  private mapTasksToUserItems(tasks: any[]): WorkStatusUserItem[] {
    return tasks.flatMap((task) => {
      const users = Array.isArray(task.assignedTo) ? task.assignedTo : [];

      return users.map((user) => ({
        status: task.status,
        startDate: task.startDate,
        dueDate: task.dueDate,
        endDate: task.endDate,
        endTime: task.endTime,
        user: this.mapUser(user),
      }));
    });
  }

  private mapFixedTasksToUserItems(fixedTasks: any[]): WorkStatusUserItem[] {
    return fixedTasks
      .filter((task) => task.assignedTo)
      .map((task) => ({
        status: task.status,
        startDate: task.startDate,
        endDate: task.endDate,
        endTime: task.endTime,
        isActive: task.isActive,
        user: this.mapUser(task.assignedTo),
      }));
  }

  private mapUser(user: any) {
    return {
      userId: user._id?.toString?.() ?? user.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }
}
