import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { FixedTaskRecurrence } from '../../fixedTask/fixed-task.schema';
import {
  UserPerformanceStatus,
  UserRole,
} from '../../user/schemas/user.schema';
import {
  ProgressFixedTask,
  ProgressMetrics,
  ProgressTask,
  ProgressUser,
} from '../types/user-progress.types';
import { DailyProgressRecord } from '../../common/utils/daily-progress-range.util';
import {
  getTehranDateParts,
  getTehranPersianDateParts,
} from '../../common/utils/tehran-time.util';

@Injectable()
export class UserProgressRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async findEvaluableUsers(): Promise<ProgressUser[]> {
    const users = await this.connection
      .collection('users')
      .find({
        roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
      })
      .project({
        firstName: 1,
        lastName: 1,
        email: 1,
        roles: 1,
      })
      .toArray();

    return users as unknown as ProgressUser[];
  }

  async findEvaluableUserById(
    userId: Types.ObjectId,
  ): Promise<ProgressUser | null> {
    const user = await this.connection.collection('users').findOne(
      {
        _id: userId,
        roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
      },
      {
        projection: {
          firstName: 1,
          lastName: 1,
          email: 1,
          roles: 1,
        },
      },
    );

    return user as unknown as ProgressUser | null;
  }

  async findAssignedWork(
    userId: Types.ObjectId,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    tasks: ProgressTask[];
    fixedTasks: ProgressFixedTask[];
  }> {
    const todayScheduleFilter = this.buildTodayScheduleFilter(periodStart);
    const taskDateFilter = {
      startDate: { $lte: periodEnd },
      endDate: { $type: 'date', $gte: periodStart },
    };
    const [tasks, fixedTasks] = await Promise.all([
      this.connection
        .collection('tasks')
        .find({
          assignedTo: userId,
          ...taskDateFilter,
        })
        .project({
          status: 1,
          dueDate: 1,
          endDate: 1,
          endTime: 1,
          doneTime: 1,
          ratingScore: 1,
          ratingStatus: 1,
        })
        .toArray(),
      this.connection
        .collection('fixedtasktemplates')
        .find({
          assignedTo: userId,
          isActive: true,
          $or: todayScheduleFilter,
        })
        .project({
          status: 1,
          doneTime: 1,
          endDate: 1,
          endTime: 1,
          ratingScore: 1,
          ratingStatus: 1,
        })
        .toArray(),
    ]);

    return {
      tasks: tasks as unknown as ProgressTask[],
      fixedTasks: fixedTasks as unknown as ProgressFixedTask[],
    };
  }

  private buildTodayScheduleFilter(date: Date): Record<string, unknown>[] {
    const tehranParts = getTehranDateParts(date);
    const weekday = new Date(
      Date.UTC(tehranParts.year, tehranParts.month - 1, tehranParts.day),
    ).getUTCDay();
    const persianParts = getTehranPersianDateParts(date);

    return [
      {
        recurrence: FixedTaskRecurrence.DAILY,
        'scheduleConfig.weekdays': weekday,
      },
      {
        recurrence: FixedTaskRecurrence.WEEKLY,
        'scheduleConfig.weekdays': weekday,
      },
      {
        recurrence: FixedTaskRecurrence.MONTHLY,
        'scheduleConfig.monthDays': persianParts.day,
      },
    ];
  }

  async saveEvaluation(
    userId: Types.ObjectId,
    progressDate: Date,
    metrics: ProgressMetrics,
    evaluatedAt: Date,
  ): Promise<void> {
    await Promise.all([
      this.connection.collection('users').updateOne(
        { _id: userId },
        {
          $set: {
            taskProgressPercentage: metrics.taskProgressPercentage,
            fixedTaskProgressPercentage: metrics.fixedTaskProgressPercentage,
            progressPercentage: metrics.progressPercentage,
            progressDate,
            performanceStatus: metrics.performanceStatus,
            performanceEvaluatedAt: evaluatedAt,
          },
        },
      ),
      this.connection.collection('userdailyprogresses').updateOne(
        { userId, date: progressDate },
        {
          $set: {
            totalTasks: metrics.totalTasks,
            completedTasks: metrics.completedTasks,
            totalFixedTasks: metrics.totalFixedTasks,
            completedFixedTasks: metrics.completedFixedTasks,
            taskProgressPercentage: metrics.taskProgressPercentage,
            fixedTaskProgressPercentage: metrics.fixedTaskProgressPercentage,
            progressPercentage: metrics.progressPercentage,
            performanceStatus: metrics.performanceStatus,
            evaluatedAt,
          },
          $setOnInsert: {
            userId,
            date: progressDate,
            createdAt: new Date(),
          },
          $currentDate: {
            updatedAt: true,
          },
        },
        { upsert: true },
      ),
    ]);
  }

  async findDailyProgressByUser(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<DailyProgressRecord[]> {
    const records = await this.connection
      .collection('userdailyprogresses')
      .find({
        userId,
        date: { $gte: from, $lte: to },
      })
      .sort({ date: 1 })
      .toArray();

    return records as unknown as DailyProgressRecord[];
  }
}
