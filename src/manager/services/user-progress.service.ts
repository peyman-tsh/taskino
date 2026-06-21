import { Injectable } from '@nestjs/common';
import { UserProgressCalculatorService } from './user-progress-calculator.service';
import { UserProgressRepository } from '../repositories/user-progress.repository';
import { ProgressUser } from '../types/user-progress.types';
import { Types } from 'mongoose';

@Injectable()
export class UserProgressService {
  constructor(
    private readonly repository: UserProgressRepository,
    private readonly calculator: UserProgressCalculatorService,
  ) {}

  async evaluate() {
    const users = await this.repository.findEvaluableUsers();
    const evaluatedAt = new Date();
    const results = await Promise.all(
      users.map((user) => this.evaluateUser(user, evaluatedAt)),
    );

    return results.sort(
      (first, second) => second.progressPercentage - first.progressPercentage,
    );
  }

  async refreshUsers(userIds: string[]): Promise<void> {
    const uniqueValidUserIds = [...new Set(userIds)].filter(
      Types.ObjectId.isValid,
    );

    await Promise.all(
      uniqueValidUserIds.map((userId) => this.refreshUser(userId)),
    );
  }

  async refreshUser(userId: string): Promise<void> {
    const user = await this.repository.findEvaluableUserById(
      new Types.ObjectId(userId),
    );
    if (!user) return;

    await this.evaluateUser(user, new Date());
  }

  private async evaluateUser(user: ProgressUser, evaluatedAt: Date) {
    const { tasks, fixedTasks } = await this.repository.findAssignedWork(
      user._id,
    );
    const metrics = this.calculator.calculate(tasks, fixedTasks);

    await this.repository.saveEvaluation(
      user._id,
      metrics.taskProgressPercentage,
      metrics.fixedTaskProgressPercentage,
      metrics.progressPercentage,
      metrics.performanceStatus,
      evaluatedAt,
    );

    return {
      userId: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roles,
      ...metrics,
      performanceEvaluatedAt: evaluatedAt,
    };
  }
}
