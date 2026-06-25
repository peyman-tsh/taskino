import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
} from '../../fixedTask/fixed-task.schema';
import { Task, TaskDocument, TaskRecurrence } from '../../task/task.schema';

@Injectable()
export class ManagerTasksRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
  ) {}

  async findAll(recurrence?: TaskRecurrence) {
    const taskFilter = recurrence ? { recurrence } : {};
    const fixedTaskFilter = recurrence
      ? { recurrence: recurrence as unknown as FixedTaskRecurrence }
      : {};
    const [tasks, fixedTasks] = await Promise.all([
      this.taskModel
        .find(taskFilter)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName email roles')
        .populate('assignedTo', 'firstName lastName email roles')
        .exec(),
      this.fixedTaskModel
        .find(fixedTaskFilter)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName email roles')
        .populate('assignedTo', 'firstName lastName email roles')
        .exec(),
    ]);

    return { tasks, fixedTasks };
  }

  async sumDailyDoneFixedTaskDuration(
    from: Date,
    to: Date,
    userId?: string,
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      status: FixedTaskStatus.DONE,
      recurrence: FixedTaskRecurrence.DAILY,
      actualDurationMinutes: { $exists: true, $ne: null },
      startDate: { $gte: from, $lte: to },
    };

    if (userId) {
      filter.assignedTo = new Types.ObjectId(userId);
    }

    const [result] = await this.fixedTaskModel
      .aggregate<{ totalActualDurationMinutes: number }>([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalActualDurationMinutes: {
              $sum: '$actualDurationMinutes',
            },
          },
        },
      ])
      .exec();

    return result?.totalActualDurationMinutes ?? 0;
  }
}
