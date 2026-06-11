import { Injectable } from '@nestjs/common';
import { UserProgressCalculatorService } from './user-progress-calculator.service';
import { UserProgressRepositoryService } from './user-progress-repository.service';
import { ProgressUser } from './user-progress.types';

@Injectable()
export class UserProgressService {
  constructor(
    private readonly repository: UserProgressRepositoryService,
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

  private async evaluateUser(user: ProgressUser, evaluatedAt: Date) {
    const { tasks, fixedTasks } = await this.repository.findAssignedWork(
      user._id,
    );
    const metrics = this.calculator.calculate(tasks, fixedTasks);

    await this.repository.saveEvaluation(
      user._id,
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
