import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
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

  async sumDoneWorkDurationForBalance(
    from: Date,
    to: Date,
    userId?: string,
  ): Promise<number> {
    const fixedTaskFilter: Record<string, unknown> = {
      status: FixedTaskStatus.DONE,
      actualDurationMinutes: { $type: 'number' },
      approvedDurationMinutes: { $type: 'number' },
      $expr: {
        $lt: ['$actualDurationMinutes', '$approvedDurationMinutes'],
      },
      $or: [
        {
          recurrence: FixedTaskRecurrence.DAILY,
          startDate: { $gte: from, $lte: to },
        },
        {
          recurrence: {
            $in: [FixedTaskRecurrence.WEEKLY, FixedTaskRecurrence.MONTHLY],
          },
          doneTime: { $gte: from, $lte: to },
        },
      ],
    };
    const taskFilter: Record<string, unknown> = {
      status: TaskStatus.DONE,
      startDate: { $gte: from, $lte: to },
      doneTime: { $type: 'date' },
      endDate: { $type: 'date' },
      $expr: {
        $and: [
          { $gte: ['$doneTime', '$startDate'] },
          { $gte: ['$endDate', '$doneTime'] },
        ],
      },
    };

    if (userId) {
      const assignedTo = new Types.ObjectId(userId);
      fixedTaskFilter.assignedTo = assignedTo;
      taskFilter.assignedTo = assignedTo;
    }

    const [fixedTaskResults, taskResults] = await Promise.all([
      this.fixedTaskModel
        .aggregate<{ totalActualDurationMinutes: number }>([
          { $match: fixedTaskFilter },
          {
            $group: {
              _id: null,
              totalActualDurationMinutes: {
                $sum: '$actualDurationMinutes',
              },
            },
          },
        ])
        .exec(),
      this.taskModel
        .aggregate<{ totalActualDurationMinutes: number }>([
          { $match: taskFilter },
          {
            $group: {
              _id: null,
              totalActualDurationMinutes: {
                $sum: {
                  $max: [
                    1,
                    {
                      $ceil: {
                        $divide: [
                          { $subtract: ['$doneTime', '$startDate'] },
                          60_000,
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        ])
        .exec(),
    ]);

    return (
      (fixedTaskResults[0]?.totalActualDurationMinutes ?? 0) +
      (taskResults[0]?.totalActualDurationMinutes ?? 0)
    );
  }
}
