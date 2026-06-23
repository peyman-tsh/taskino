import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  FixedTaskRecurrence,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { buildFixedTaskSeedSchedule } from './fixed-task-seed.service';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../../common/events/user-progress.events';
import { HolidayService } from '../../holiday/services/holiday.service';

@Injectable()
export class FixedTaskRolloverService {
  private readonly logger = new Logger(FixedTaskRolloverService.name);
  private readonly runningRecurrences = new Set<FixedTaskRecurrence>();

  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly scoreService: FixedTaskScoreService,
    private readonly eventBus: InternalEventBus,
    private readonly holidayService: HolidayService,
  ) {}

  @Cron('1 0 * * *', { timeZone: 'Asia/Tehran' })
  async handleDailyRollover(): Promise<void> {
    if (await this.holidayService.isOfficialHoliday(new Date())) {
      this.logger.log('Daily fixed task rollover skipped on official holiday');
      return;
    }

    await this.runForRecurrence(FixedTaskRecurrence.DAILY);
  }

  @Cron('1 0 * * 6', { timeZone: 'Asia/Tehran' })
  async handleWeeklyRollover(): Promise<void> {
    await this.runForRecurrence(FixedTaskRecurrence.WEEKLY);
  }

  @Cron('1 0 1 * *', { timeZone: 'Asia/Tehran' })
  async handleMonthlyRollover(): Promise<void> {
    await this.runForRecurrence(FixedTaskRecurrence.MONTHLY);
  }

  async runForRecurrence(
    recurrence: FixedTaskRecurrence,
    now = new Date(),
  ): Promise<number> {
    if (this.runningRecurrences.has(recurrence)) return 0;
    this.runningRecurrences.add(recurrence);

    try {
      const candidates =
        await this.repository.findActiveRolloverCandidates(recurrence);
      let createdCount = 0;

      for (const candidate of candidates) {
        if (!(await this.rolloverIfExpired(candidate, now))) continue;
        createdCount += 1;
      }

      return createdCount;
    } finally {
      this.runningRecurrences.delete(recurrence);
    }
  }

  async runOnce(now = new Date()): Promise<number> {
    const counts = await Promise.all(
      Object.values(FixedTaskRecurrence).map((recurrence) =>
        this.runForRecurrence(recurrence, now),
      ),
    );
    return counts.reduce((total, count) => total + count, 0);
  }

  private async rolloverIfExpired(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Promise<boolean> {
    await this.scoreService.adjustTaskScore(candidate);

    const claimed = await this.repository.claimExpiredOccurrence(
      candidate._id,
      now,
    );
    if (!claimed) return false;

    try {
      const schedule = buildFixedTaskSeedSchedule(candidate.recurrence, now);
      await this.repository.createNextOccurrence(candidate, schedule);
      this.eventBus.publish(
        UserProgressEvents.REFRESH_REQUESTED,
        new UserProgressRefreshRequestedEvent([
          candidate.assignedTo.toString(),
        ]),
      );
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
