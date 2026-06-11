import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { UserPerformanceStatus, UserRole } from '../../user/schemas/user.schema';
import {
  ProgressFixedTask,
  ProgressTask,
  ProgressUser,
} from './user-progress.types';

@Injectable()
export class UserProgressRepositoryService {
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

  async findAssignedWork(userId: Types.ObjectId): Promise<{
    tasks: ProgressTask[];
    fixedTasks: ProgressFixedTask[];
  }> {
    const [tasks, fixedTasks] = await Promise.all([
      this.connection
        .collection('tasks')
        .find({ assignedTo: userId })
        .project({ status: 1, dueDate: 1, doneTime: 1 })
        .toArray(),
      this.connection
        .collection('fixedtasktemplates')
        .find({ assignedTo: userId })
        .project({ status: 1, doneTime: 1 })
        .toArray(),
    ]);

    return {
      tasks: tasks as unknown as ProgressTask[],
      fixedTasks: fixedTasks as unknown as ProgressFixedTask[],
    };
  }

  async saveEvaluation(
    userId: Types.ObjectId,
    progressPercentage: number,
    performanceStatus: UserPerformanceStatus,
    evaluatedAt: Date,
  ): Promise<void> {
    await this.connection.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          progressPercentage,
          performanceStatus,
          performanceEvaluatedAt: evaluatedAt,
        },
      },
    );
  }
}
