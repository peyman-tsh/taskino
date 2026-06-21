import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { UserPerformanceStatus, UserRole } from '../../user/schemas/user.schema';
import {
  ProgressFixedTask,
  ProgressTask,
  ProgressUser,
} from '../types/user-progress.types';

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
    const monthlyDateFilter = {
      $or: [
        { startDate: { $gte: periodStart, $lt: periodEnd } },
        {
          startDate: null,
          createdAt: { $gte: periodStart, $lt: periodEnd },
        },
      ],
    };
    const [tasks, fixedTasks] = await Promise.all([
      this.connection
        .collection('tasks')
        .find({
          assignedTo: userId,
          ...monthlyDateFilter,
        })
        .project({ status: 1, dueDate: 1, doneTime: 1 })
        .toArray(),
      this.connection
        .collection('fixedtasktemplates')
        .find({
          assignedTo: userId,
          ...monthlyDateFilter,
        })
        .project({ status: 1, doneTime: 1, endDate: 1, endTime: 1 })
        .toArray(),
    ]);

    return {
      tasks: tasks as unknown as ProgressTask[],
      fixedTasks: fixedTasks as unknown as ProgressFixedTask[],
    };
  }

  async saveEvaluation(
    userId: Types.ObjectId,
    taskProgressPercentage: number,
    fixedTaskProgressPercentage: number,
    progressPercentage: number,
    performanceStatus: UserPerformanceStatus,
    evaluatedAt: Date,
  ): Promise<void> {
    await this.connection.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          taskProgressPercentage,
          fixedTaskProgressPercentage,
          progressPercentage,
          performanceStatus,
          performanceEvaluatedAt: evaluatedAt,
        },
      },
    );
  }
}
