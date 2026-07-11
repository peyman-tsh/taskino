import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../../common/events/user-progress.events';
import { HolidayService } from '../../holiday/services/holiday.service';
import { FixedTaskScheduleService } from './fixed-task-schedule.service';
import {
  getTehranDateParts,
  tehranDateTimeToUtc,
} from '../../common/utils/tehran-time.util';

@Injectable()
export class FixedTaskRolloverService {
  private readonly logger = new Logger(FixedTaskRolloverService.name);
  private readonly runningRecurrences = new Set<FixedTaskRecurrence>();

  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly scoreService: FixedTaskScoreService,
    private readonly eventBus: InternalEventBus,
    private readonly holidayService: HolidayService,
    private readonly scheduleService: FixedTaskScheduleService,
  ) {}

  @Cron('08 0 * * *', { timeZone: 'Asia/Tehran' })
  async handleDailyRollover(): Promise<void> {
    this.logger.log('Daily fixed task rollover started');

    if (await this.holidayService.isNonWorkingDay(new Date())) {
      this.logger.log(
        'Daily fixed task rollover skipped on official holiday or Friday',
      );
      return;
    }

    const createdCount = await this.runForRecurrence(FixedTaskRecurrence.DAILY);
    this.logger.log(
      `Daily fixed task rollover finished. Created ${createdCount} new occurrence(s)`,
    );
  }

  @Cron('08 0 * * *', { timeZone: 'Asia/Tehran' })
  async handleWeeklyRollover(): Promise<void> {
    this.logger.log('Weekly fixed task rollover started');

    if (await this.holidayService.isNonWorkingDay(new Date())) {
      this.logger.log(
        'Weekly fixed task rollover skipped on official holiday or Friday',
      );
      return;
    }

    const createdCount = await this.runForRecurrence(FixedTaskRecurrence.WEEKLY);
    this.logger.log(
      `Weekly fixed task rollover finished. Created ${createdCount} new occurrence(s)`,
    );
  }

  @Cron('08 0 * * *', { timeZone: 'Asia/Tehran' })
  async handleMonthlyRollover(): Promise<void> {
    this.logger.log('Monthly fixed task rollover started');

    const createdCount = await this.runForRecurrence(FixedTaskRecurrence.MONTHLY);
    this.logger.log(
      `Monthly fixed task rollover finished. Created ${createdCount} new occurrence(s)`,
    );
  }

  async runForRecurrence(
    recurrence: FixedTaskRecurrence,
    now = new Date(),
  ): Promise<number> {
    if (this.runningRecurrences.has(recurrence)) return 0;
    this.runningRecurrences.add(recurrence);

    try {
      const candidates = await this.findRolloverCandidates(recurrence);
      let createdCount = 0;

      for (const candidate of candidates) {
        if (!this.hasScheduleConfig(candidate)) continue;

        const shouldGenerateToday =
          await this.scheduleService.shouldGenerateTodayForCron(
            candidate,
            now,
          );

        if (!shouldGenerateToday) {
          await this.deactivateExpiredUnfinishedMonthlyTask(candidate, now);
          await this.deactivateUnscheduledDailyTask(candidate, now);
          continue;
        }
        if (this.startedToday(candidate, now)) {
          await this.activateScheduledOccurrence(candidate);
          continue;
        }
        const created = candidate.isActive
          ? await this.rolloverIfExpired(candidate, now)
          : await this.createNextOccurrenceFromPrevious(candidate, now);
        if (!created) continue;
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

  private async findRolloverCandidates(
    recurrence: FixedTaskRecurrence,
  ): Promise<FixedTaskTemplateDocument[]> {
    const candidates =
      recurrence === FixedTaskRecurrence.DAILY
        ? await this.repository.findDailyRolloverCandidates()
        : await this.repository.findConfiguredRolloverCandidates(recurrence);
    const latestBySeries = new Map<string, FixedTaskTemplateDocument>();

    for (const candidate of candidates) {
      const seriesKey = this.scheduleService.getSeriesKey(candidate);
      const existing = latestBySeries.get(seriesKey);
      if (!existing || (candidate.isActive && !existing.isActive)) {
        latestBySeries.set(seriesKey, candidate);
      }
    }

    return Array.from(latestBySeries.values());
  }

  private async deactivateUnscheduledDailyTask(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Promise<void> {
    if (
      candidate.recurrence !== FixedTaskRecurrence.DAILY ||
      !candidate.isActive ||
      !this.hasScheduleConfig(candidate)
    ) {
      return;
    }

    await this.scoreService.adjustTaskScore(candidate);
    const claimed = await this.repository.claimExpiredOccurrence(
      candidate._id,
      now,
    );
    if (!claimed) return;

    this.publishProgressRefresh(candidate);
  }

  private async deactivateExpiredUnfinishedMonthlyTask(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Promise<void> {
    if (!this.shouldDeactivateExpiredUnfinishedMonthlyTask(candidate, now)) {
      return;
    }

    await this.scoreService.adjustTaskScore(candidate);
    const claimed = await this.repository.claimExpiredOccurrence(
      candidate._id,
      now,
    );
    if (!claimed) return;

    this.publishProgressRefresh(candidate);
  }

  private shouldDeactivateExpiredUnfinishedMonthlyTask(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): boolean {
    return (
      candidate.recurrence === FixedTaskRecurrence.MONTHLY &&
      candidate.isActive &&
      this.scheduleService.hasScheduleConfig(candidate) &&
      this.isUnfinished(candidate) &&
      this.isExpired(candidate, now)
    );
  }

  private isUnfinished(candidate: FixedTaskTemplateDocument): boolean {
    return (
      candidate.status === FixedTaskStatus.TODO ||
      candidate.status === FixedTaskStatus.IN_PROGRESS
    );
  }

  private isExpired(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): boolean {
    const deadline = this.getDeadline(candidate);
    return Boolean(deadline && deadline.getTime() < now.getTime());
  }

  private getDeadline(candidate: FixedTaskTemplateDocument): Date | null {
    if (!(candidate.endDate instanceof Date)) return null;
    if (!candidate.endTime) return candidate.endDate;

    const [hours, minutes] = candidate.endTime.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return candidate.endDate;
    }

    const endDate = getTehranDateParts(candidate.endDate);
    return tehranDateTimeToUtc(
      endDate.year,
      endDate.month,
      endDate.day,
      hours,
      minutes,
      0,
      999,
    );
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
      await this.createNextOccurrence(candidate, now);
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

  private async createNextOccurrenceFromPrevious(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Promise<boolean> {
    try {
      await this.createNextOccurrence(candidate, now);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create next fixed task occurrence from "${candidate._id.toString()}": ${message}`,
      );
      return false;
    }
  }

  private async createNextOccurrence(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Promise<void> {
    const schedule = this.buildRolloverSchedule(candidate, now);
    await this.repository.createNextOccurrence(candidate, schedule);
    this.publishProgressRefresh(candidate);
  }

  private buildRolloverSchedule(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ) {
    return this.scheduleService.buildRolloverSchedule(candidate, now);
  }

  private publishProgressRefresh(candidate: FixedTaskTemplateDocument): void {
    this.eventBus.publish(
      UserProgressEvents.REFRESH_REQUESTED,
      new UserProgressRefreshRequestedEvent([candidate.assignedTo.toString()]),
    );
  }

  private hasScheduleConfig(candidate: FixedTaskTemplateDocument): boolean {
    return this.scheduleService.hasScheduleConfig(candidate);
  }

  private async activateScheduledOccurrence(
    candidate: FixedTaskTemplateDocument,
  ): Promise<void> {
    if (candidate.isActive) return;

    await this.repository.activateOccurrence(candidate._id);
    this.publishProgressRefresh(candidate);
  }

  private startedToday(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): boolean {
    if (!candidate.startDate) return false;

    const start = this.getTehranCalendar(candidate.startDate);
    const today = this.getTehranCalendar(now);
    return (
      start.year === today.year &&
      start.month === today.month &&
      start.day === today.day
    );
  }

  private getTehranCalendar(date: Date) {
    const parts = getTehranDateParts(date);

    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
    };
  }
}
