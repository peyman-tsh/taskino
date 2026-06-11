import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { TaskRecurrence } from '../../task/task.schema';
import {
  UserPerformanceStatus,
  UserRole,
} from '../../user/schemas/user.schema';
import { PerformancePeriod } from '../services/performance-period.service';
import {
  PeriodPerformanceFixedTask,
  PeriodPerformanceTask,
  PeriodPerformanceUser,
} from '../services/period-performance.types';

@Injectable()
export class PeriodPerformanceRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async findSpecialist(userId: Types.ObjectId): Promise<PeriodPerformanceUser> {
    const user = await this.connection.collection('users').findOne({
      _id: userId,
      roles: UserRole.SPECIALIST,
    });
    if (!user) {
      throw new NotFoundException('Specialist user not found');
    }

    return user as unknown as PeriodPerformanceUser;
  }

  async findWork(
    userId: Types.ObjectId,
    recurrence: TaskRecurrence,
    period: PerformancePeriod,
  ): Promise<{
    tasks: PeriodPerformanceTask[];
    fixedTasks: PeriodPerformanceFixedTask[];
  }> {
    const [tasks, fixedTasks] = await Promise.all([
      this.connection
        .collection('tasks')
        .find({
          assignedTo: userId,
          recurrence,
          createdAt: { $lt: period.end },
        })
        .project({ status: 1, dueDate: 1, doneTime: 1 })
        .toArray(),
      this.connection
        .collection('fixedtasktemplates')
        .find({
          assignedTo: userId,
          recurrence,
          isActive: true,
          createdAt: { $lt: period.end },
        })
        .project({ status: 1, doneTime: 1 })
        .toArray(),
    ]);

    return {
      tasks: tasks as unknown as PeriodPerformanceTask[],
      fixedTasks: fixedTasks as unknown as PeriodPerformanceFixedTask[],
    };
  }

  async saveEvaluation(
    userId: Types.ObjectId,
    performanceStatus: UserPerformanceStatus,
    progressPercentage: number,
    recurrence: TaskRecurrence,
    period: PerformancePeriod,
    evaluatedAt: Date,
  ): Promise<void> {
    await this.connection.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          performanceStatus,
          progressPercentage,
          performanceRecurrence: recurrence,
          performancePeriodStart: period.start,
          performancePeriodEnd: period.end,
          performanceEvaluatedAt: evaluatedAt,
        },
      },
    );
  }
}
