import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
  FixedTaskTimingApprovalStatus,
} from '../../fixedTask/fixed-task.schema';
import { Task, TaskDocument } from '../../task/task.schema';
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
    managerId: string,
  ): Promise<{
    tasks: WorkStatusItem[];
    fixedTasks: WorkStatusItem[];
  }> {
    const dateFilter = {
      $or: [
        { startDate: { $gte: from, $lte: to } },
        {
          startDate: null,
          createdAt: { $gte: from, $lte: to },
        },
      ],
    };
    const fixedTaskFilter = {
      $and: [
        dateFilter,
        {
          $nor: [
            {
              timingApprovalStatus: FixedTaskTimingApprovalStatus.REJECTED,
              timingApprovedBy: new Types.ObjectId(managerId),
            },
          ],
        },
      ],
    };
    const [tasks, fixedTasks] = await Promise.all([
      this.taskModel
        .find(dateFilter)
        .select('status dueDate endDate endTime')
        .lean()
        .exec(),
      this.fixedTaskModel
        .find(fixedTaskFilter)
        .select('status endDate endTime')
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
    const dateFilter = this.buildDateFilter(from, to);
    const taskFilter = this.buildTaskFilter(dateFilter, userId);
    const fixedTaskFilter = this.buildFixedTaskFilter(
      dateFilter,
      managerId,
      userId,
    );

    const [tasks, fixedTasks] = await Promise.all([
      this.taskModel
        .find(taskFilter)
        .select('status dueDate endDate endTime assignedTo')
        .populate('assignedTo', 'firstName lastName email')
        .lean()
        .exec(),
      this.fixedTaskModel
        .find(fixedTaskFilter)
        .select('status endDate endTime assignedTo isActive')
        .populate('assignedTo', 'firstName lastName email')
        .lean()
        .exec(),
    ]);

    return {
      tasks: this.mapTasksToUserItems(tasks),
      fixedTasks: this.mapFixedTasksToUserItems(fixedTasks),
    };
  }

  private buildDateFilter(from: Date, to: Date) {
    return {
      $or: [
        { startDate: { $gte: from, $lte: to } },
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
    managerId: string,
    userId?: string,
  ) {
    const filters: Record<string, unknown>[] = [
      dateFilter,
      {
        $nor: [
          {
            timingApprovalStatus: FixedTaskTimingApprovalStatus.REJECTED,
            timingApprovedBy: new Types.ObjectId(managerId),
          },
        ],
      },
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

  private mapTasksToUserItems(tasks: any[]): WorkStatusUserItem[] {
    return tasks.flatMap((task) => {
      const users = Array.isArray(task.assignedTo) ? task.assignedTo : [];

      return users.map((user) => ({
        status: task.status,
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
