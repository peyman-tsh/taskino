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
import {
  addTehranCalendarPeriod,
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
  ) {}

  @Cron('53 1 * * *', { timeZone: 'Asia/Tehran' })
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

  @Cron('53 1 * * *', { timeZone: 'Asia/Tehran' })
  async handleWeeklyRollover(): Promise<void> {
    await this.runForRecurrence(FixedTaskRecurrence.WEEKLY);
  }

  @Cron('53 1 * * *', { timeZone: 'Asia/Tehran' })
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
      const candidates = await this.findRolloverCandidates(recurrence);
      let createdCount = 0;

      for (const candidate of candidates) {
        if (!this.shouldGenerateToday(candidate, now)) {
          await this.deactivateUnscheduledDailyTask(candidate, now);
          continue;
        }
        if (this.startedToday(candidate, now)) continue;
        if (this.isConfiguredDailyBlockStillOpen(candidate, now)) continue;
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
    if (recurrence !== FixedTaskRecurrence.DAILY) {
      return this.repository.findActiveRolloverCandidates(recurrence);
    }

    const candidates = await this.repository.findDailyRolloverCandidates();
    const latestBySeries = new Map<string, FixedTaskTemplateDocument>();

    for (const candidate of candidates) {
      const seriesKey = this.getSeriesKey(candidate);
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
    const schedule = buildFixedTaskSeedSchedule(candidate.recurrence, now);

    if (
      candidate.recurrence === FixedTaskRecurrence.DAILY &&
      this.hasDailyScheduleGap(candidate)
    ) {
      schedule.endDate = this.calculateConfiguredDailyBlockEndDate(
        candidate,
        now,
      );
    }

    if (
      candidate.recurrence === FixedTaskRecurrence.WEEKLY &&
      this.hasConfiguredWeekdays(candidate)
    ) {
      schedule.endDate = this.calculateNextConfiguredWeekdayEndDate(
        candidate,
        now,
      );
    }

    if (
      candidate.recurrence === FixedTaskRecurrence.MONTHLY &&
      this.hasConfiguredMonthDays(candidate)
    ) {
      schedule.endDate = this.calculateNextConfiguredMonthDayEndDate(
        candidate,
        now,
      );
    }

    return schedule;
  }

  private publishProgressRefresh(candidate: FixedTaskTemplateDocument): void {
    this.eventBus.publish(
      UserProgressEvents.REFRESH_REQUESTED,
      new UserProgressRefreshRequestedEvent([candidate.assignedTo.toString()]),
    );
  }

  private shouldGenerateToday(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): boolean {
    const today = this.getTehranCalendar(now);

    if (!this.hasScheduleConfig(candidate)) {
      return this.shouldRunDefaultSchedule(candidate.recurrence, today);
    }

    return this.shouldRunConfiguredSchedule(candidate, today);
  }

  private hasScheduleConfig(candidate: FixedTaskTemplateDocument): boolean {
    const config = candidate.scheduleConfig;
    return Boolean(config?.weekdays?.length || config?.monthDays?.length);
  }

  private hasDailyScheduleGap(candidate: FixedTaskTemplateDocument): boolean {
    const weekdays = candidate.scheduleConfig?.weekdays;
    return (
      candidate.recurrence === FixedTaskRecurrence.DAILY &&
      Array.isArray(weekdays) &&
      weekdays.length > 0 &&
      new Set(weekdays).size < 7
    );
  }

  private hasConfiguredWeekdays(
    candidate: FixedTaskTemplateDocument,
  ): boolean {
    return Boolean(candidate.scheduleConfig?.weekdays?.length);
  }

  private hasConfiguredMonthDays(
    candidate: FixedTaskTemplateDocument,
  ): boolean {
    return Boolean(candidate.scheduleConfig?.monthDays?.length);
  }

  private shouldRunDefaultSchedule(
    recurrence: FixedTaskRecurrence,
    today: { day: number; weekday: number },
  ): boolean {
    if (recurrence === FixedTaskRecurrence.DAILY) {
      return true;
    }

    if (recurrence === FixedTaskRecurrence.WEEKLY) {
      return today.weekday === 6;
    }

    return today.day === 1;
  }

  private shouldRunConfiguredSchedule(
    candidate: FixedTaskTemplateDocument,
    today: { day: number; weekday: number },
  ): boolean {
    const config = candidate.scheduleConfig;

    if (candidate.recurrence === FixedTaskRecurrence.MONTHLY) {
      return Boolean(config?.monthDays?.includes(today.day));
    }

    return Boolean(config?.weekdays?.includes(today.weekday));
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

  private isConfiguredDailyBlockStillOpen(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): boolean {
    if (
      !candidate.isActive ||
      !this.hasDailyScheduleGap(candidate) ||
      !(candidate.endDate instanceof Date)
    ) {
      return false;
    }

    return candidate.endDate.getTime() > now.getTime();
  }

  private calculateConfiguredDailyBlockEndDate(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Date {
    const weekdays = new Set(candidate.scheduleConfig?.weekdays ?? []);
    const today = this.getTehranCalendar(now);
    let blockDays = 1;

    for (let offset = 1; offset < 7; offset += 1) {
      const nextWeekday = (today.weekday + offset) % 7;
      if (!weekdays.has(nextWeekday)) break;
      blockDays += 1;
    }

    const target = addTehranCalendarPeriod(now, blockDays, 0);
    return tehranDateTimeToUtc(target.year, target.month, target.day);
  }

  private calculateNextConfiguredWeekdayEndDate(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Date {
    const weekdays = new Set(candidate.scheduleConfig?.weekdays ?? []);
    const today = this.getTehranCalendar(now);

    for (let offset = 1; offset <= 7; offset += 1) {
      const nextWeekday = (today.weekday + offset) % 7;
      if (!weekdays.has(nextWeekday)) continue;

      const target = addTehranCalendarPeriod(now, offset, 0);
      return tehranDateTimeToUtc(target.year, target.month, target.day);
    }

    const fallback = addTehranCalendarPeriod(now, 7, 0);
    return tehranDateTimeToUtc(fallback.year, fallback.month, fallback.day);
  }

  private calculateNextConfiguredMonthDayEndDate(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): Date {
    const today = this.getTehranCalendar(now);
    const monthDays = [...new Set(candidate.scheduleConfig?.monthDays ?? [])]
      .filter((day) => day >= 1 && day <= 31)
      .sort((first, second) => first - second);

    const nextDay = monthDays.find((day) => day > today.day);
    if (nextDay) {
      const safeDay = this.clampDayToMonth(today.year, today.month, nextDay);
      return tehranDateTimeToUtc(today.year, today.month, safeDay);
    }

    const nextMonth = today.month === 12 ? 1 : today.month + 1;
    const nextYear = today.month === 12 ? today.year + 1 : today.year;
    const firstConfiguredDay = monthDays[0] ?? today.day;
    const safeDay = this.clampDayToMonth(
      nextYear,
      nextMonth,
      firstConfiguredDay,
    );

    return tehranDateTimeToUtc(nextYear, nextMonth, safeDay);
  }

  private clampDayToMonth(year: number, month: number, day: number): number {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Math.min(day, lastDay);
  }

  private getTehranCalendar(date: Date) {
    const parts = getTehranDateParts(date);
    const calendarDate = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day),
    );

    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      weekday: calendarDate.getUTCDay(),
    };
  }

  private getSeriesKey(candidate: FixedTaskTemplateDocument): string {
    const sourceIdentity =
      candidate.originalSourceRow ??
      candidate.sourceRow ??
      `${candidate.title}:${candidate.description}`;

    return [
      candidate.recurrence,
      candidate.assignedTo.toString(),
      candidate.createdBy.toString(),
      candidate.sourceExcel ?? '',
      candidate.sourceSheet ?? '',
      sourceIdentity,
    ].join('|');
  }
}
