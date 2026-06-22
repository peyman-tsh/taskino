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
}
