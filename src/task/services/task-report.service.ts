import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateCountDto } from '../dto/dateCount.dto';
import { TaskCompletionStatsDto } from '../dto/task-count.dto';
import { Task, TaskDocument, TaskStatus } from '../task.schema';
import { TaskPolicyService } from './task-policy.service';
import { TaskScoreService } from './task-score.service';

@Injectable()
export class TaskReportService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    private readonly taskPolicy: TaskPolicyService,
    private readonly taskScoreService: TaskScoreService,
  ) {}

  async getTaskCompletionStats(dto: TaskCompletionStatsDto) {
    const { managerId, expertId } = dto;
    this.taskPolicy.validateObjectId(managerId);
    this.taskPolicy.validateObjectId(expertId);

    const managerExpertQuery = {
      createdBy: new Types.ObjectId(managerId),
      assignedTo: new Types.ObjectId(expertId),
    };
    const [totalTasks, completedTasks, pendingTodo, pendingInProgress] =
      await Promise.all([
        this.taskModel.countDocuments(managerExpertQuery).exec(),
        this.taskModel
          .countDocuments({ ...managerExpertQuery, status: TaskStatus.DONE })
          .exec(),
        this.taskModel
          .countDocuments({ ...managerExpertQuery, status: TaskStatus.TODO })
          .exec(),
        this.taskModel
          .countDocuments({
            ...managerExpertQuery,
            status: TaskStatus.IN_PROGRESS,
          })
          .exec(),
      ]);

    return {
      managerId,
      expertId,
      totalTasks,
      completedTasks,
      pendingTasks: pendingTodo + pendingInProgress,
      pendingByStatus: {
        todo: pendingTodo,
        in_progress: pendingInProgress,
      },
      completedByStatus: {
        done: completedTasks,
      },
    };
  }

  async findTasksByUserAndCount(dateCountDto: DateCountDto) {
    this.taskPolicy.validateObjectId(dateCountDto.userId);

    const rangeStart = new Date(dateCountDto.startdate);
    const rangeEnd = new Date(dateCountDto.enddate);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const tasks = await this.taskModel
      .find({
        assignedTo: new Types.ObjectId(dateCountDto.userId),
        startDate: { $lte: rangeEnd },
        dueDate: { $gte: rangeStart },
      })
      .exec();

    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.DONE,
    ).length;
    const todoTasks = tasks.filter(
      (task) => task.status === TaskStatus.TODO,
    ).length;

    await this.taskScoreService.adjustUserScore(dateCountDto.userId, tasks);

    return {
      userId: dateCountDto.userId,
      startDate: dateCountDto.startdate,
      endDate: dateCountDto.enddate,
      todoTasks,
      totalTasks: tasks.length,
      completedTasks,
      pendingTasks: tasks.length - completedTasks,
    };
  }

  countOpenTasks(): Promise<number> {
    return this.taskModel
      .countDocuments({
        status: { $in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
      })
      .exec();
  }

  async getTaskStatusOverview() {
    const statusCounts = await this.taskModel
      .aggregate<{ _id: TaskStatus; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();
    const counts = statusCounts.reduce(
      (result, item) => ({ ...result, [item._id]: item.count }),
      {
        [TaskStatus.TODO]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.DONE]: 0,
      },
    );

    return {
      totalTasks:
        counts[TaskStatus.TODO] +
        counts[TaskStatus.IN_PROGRESS] +
        counts[TaskStatus.DONE],
      todoTasks: counts[TaskStatus.TODO],
      inProgressTasks: counts[TaskStatus.IN_PROGRESS],
      doneTasks: counts[TaskStatus.DONE],
    };
  }

  getTaskCountsByAssignee() {
    return this.taskModel
      .aggregate([
        { $unwind: '$assignedTo' },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            todoTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.TODO] }, 1, 0] },
            },
            inProgressTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0],
              },
            },
            doneTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$_id' },
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            totalTasks: 1,
            todoTasks: 1,
            inProgressTasks: 1,
            doneTasks: 1,
          },
        },
        { $sort: { totalTasks: -1, doneTasks: -1 } },
      ])
      .exec();
  }

  async getMonthlyUserPerformance(query: { month: number; year: number }) {
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 1);
    const users = await this.taskModel
      .aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
          },
        },
        { $unwind: '$assignedTo' },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0] },
            },
            inProgressTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0],
              },
            },
            pendingTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.TODO] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$_id' },
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            score: { $ifNull: ['$user.score', 0] },
            totalTasks: 1,
            completedTasks: 1,
            inProgressTasks: 1,
            pendingTasks: 1,
            completionRate: {
              $cond: [
                { $gt: ['$totalTasks', 0] },
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ['$completedTasks', '$totalTasks'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { completionRate: -1, score: -1, completedTasks: -1 } },
      ])
      .exec();

    return {
      month: query.month,
      year: query.year,
      users,
    };
  }
}
