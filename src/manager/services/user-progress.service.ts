import { BadRequestException, Injectable } from '@nestjs/common';
import { UserProgressCalculatorService } from './user-progress-calculator.service';
import { UserProgressRepository } from '../repositories/user-progress.repository';
import { ProgressUser } from '../types/user-progress.types';
import { Types } from 'mongoose';
import {
  buildDailyProgressRange,
  getTehranDayRange,
  parseTehranDayBoundary,
  parseTehranDailyProgressRangeEnd,
} from '../../common/utils/daily-progress-range.util';

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

  async refreshUsers(userIds: string[], progressDate?: Date): Promise<void> {
    const uniqueValidUserIds = [...new Set(userIds)].filter(
      Types.ObjectId.isValid,
    );

    await Promise.all(
      uniqueValidUserIds.map((userId) =>
        this.refreshUser(userId, progressDate),
      ),
    );
  }

  async refreshUser(userId: string, progressDate?: Date): Promise<void> {
    const user = await this.repository.findEvaluableUserById(
      new Types.ObjectId(userId),
    );
    if (!user) return;

    await this.evaluateUser(user, new Date(), progressDate);
  }

  private async evaluateUser(
    user: ProgressUser,
    evaluatedAt: Date,
    progressDate = evaluatedAt,
  ) {
    const { periodStart, periodEnd } = getTehranDayRange(progressDate);
    const { tasks, fixedTasks } = await this.repository.findAssignedWork(
      user._id,
      periodStart,
      periodEnd,
    );
    const metrics = this.calculator.calculate(tasks, fixedTasks);

    await this.repository.saveEvaluation(
      user._id,
      periodStart,
      metrics,
      evaluatedAt,
    );

    return {
      userId: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roles,
      ...metrics,
      progressDate: periodStart,
      performanceEvaluatedAt: evaluatedAt,
    };
  }

  async getDailyProgress(userId: string, fromValue: string, toValue: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const from = parseTehranDayBoundary(fromValue);
    const to = parseTehranDailyProgressRangeEnd(toValue);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }

    const records = await this.repository.findDailyProgressByUser(
      new Types.ObjectId(userId),
      from,
      to,
    );
    const range = buildDailyProgressRange(from, to, records);

    return {
      userId,
      from,
      to,
      dayCount: range.dayCount,
      averageProgressPercentage: range.averageProgressPercentage,
      total: range.data.length,
      data: range.data,
    };
  }
}
