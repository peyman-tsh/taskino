import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { EvaluateUserPerformanceDto } from '../dto/evaluate-user-performance.dto';
import { PerformancePeriodService } from './performance-period.service';
import { PeriodPerformanceCalculatorService } from './period-performance-calculator.service';
import { PeriodPerformanceRepository } from '../repositories/period-performance.repository';

@Injectable()
export class PeriodPerformanceService {
  constructor(
    private readonly periodService: PerformancePeriodService,
    private readonly calculator: PeriodPerformanceCalculatorService,
    private readonly repository: PeriodPerformanceRepository,
  ) {}

  async evaluateSpecialist(userId: Types.ObjectId, dto: EvaluateUserPerformanceDto) {
    const user = await this.repository.findSpecialist(userId);
    const referenceDate = dto.referenceDate
      ? new Date(dto.referenceDate)
      : new Date();
    const period = this.periodService.getPeriod(dto.recurrence, referenceDate);
    const { tasks, fixedTasks } = await this.repository.findWork(
      userId,
      dto.recurrence,
      period,
    );
    const metrics = this.calculator.calculate(
      dto.recurrence,
      period,
      tasks,
      fixedTasks,
    );
    const evaluatedAt = new Date();

    await this.repository.saveEvaluation(
      userId,
      metrics.performanceStatus,
      metrics.progressPercentage,
      dto.recurrence,
      period,
      evaluatedAt,
    );

    return {
      userId: userId.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      ...metrics,
      performanceEvaluatedAt: evaluatedAt,
    };
  }
}
