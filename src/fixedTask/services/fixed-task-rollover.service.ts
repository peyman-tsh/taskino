import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FixedTaskTemplateDocument } from '../fixed-task.schema';
import { FixedTaskStatus } from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';
import { buildFixedTaskSeedSchedule } from './fixed-task-seed.service';

@Injectable()
export class FixedTaskRolloverService {
  private readonly logger = new Logger(FixedTaskRolloverService.name);
  private isRunning = false;

  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly deadlineService: FixedTaskDeadlineService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleRollover(): Promise<void> {
    await this.runOnce();
  }

  async runOnce(now = new Date()): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    try {
      const candidates =
        await this.repository.findActiveRolloverCandidates(now);
      let createdCount = 0;

      for (const candidate of candidates) {
        if (!(await this.rolloverIfExpired(candidate, now))) continue;
        createdCount += 1;
      }

      return createdCount;
    } finally {
      this.isRunning = false;
    }
  }

  private async rolloverIfExpired(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Promise<boolean> {
    if (candidate.status !== FixedTaskStatus.DONE) {
      const deadline = this.deadlineService.getScoreDeadline(candidate);
      if (!deadline || deadline.getTime() > now.getTime()) return false;
    }

    const claimed = await this.repository.claimExpiredOccurrence(
      candidate._id,
      now,
    );
    if (!claimed) return false;

    try {
      const schedule = buildFixedTaskSeedSchedule(candidate.recurrence, now);
      await this.repository.createNextOccurrence(candidate, schedule);
      return true;
    } catch (error) {
      await this.repository.reactivateOccurrence(candidate._id);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to roll over fixed task "${candidate._id.toString()}": ${message}`,
      );
      return false;
    }
  }
}
