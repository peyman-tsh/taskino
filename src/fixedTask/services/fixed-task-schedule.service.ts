import { Injectable } from '@nestjs/common';
import {
  FixedTaskRecurrence,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { buildFixedTaskSeedSchedule } from './fixed-task-seed.service';
import {
  addTehranCalendarPeriod,
  getPersianMonthLength,
  getTehranDateParts,
  getTehranPersianDateParts,
  tehranDateTimeToUtc,
  tehranPersianDateTimeToUtc,
} from '../../common/utils/tehran-time.util';

@Injectable()
export class FixedTaskScheduleService {
  hasScheduleConfig(candidate: FixedTaskTemplateDocument): boolean {
    const config = candidate.scheduleConfig;
    return Boolean(config?.weekdays?.length || config?.monthDays?.length);
  }

  shouldGenerateToday(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): boolean {
    const today = this.getTehranCalendar(now);

    if (!this.hasScheduleConfig(candidate)) {
      return this.shouldRunDefaultSchedule(candidate.recurrence, today);
    }

    return this.shouldRunConfiguredSchedule(candidate, today);
  }

  shouldGenerateTodayForCron(
    candidate: FixedTaskTemplateDocument,
    now: Date,
  ): boolean {
    return this.shouldGenerateToday(candidate, now);
  }

  buildRolloverSchedule(
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

  hasDailyScheduleGap(candidate: FixedTaskTemplateDocument): boolean {
    const weekdays = candidate.scheduleConfig?.weekdays;
    return (
      candidate.recurrence === FixedTaskRecurrence.DAILY &&
      Array.isArray(weekdays) &&
      weekdays.length > 0 &&
      new Set(weekdays).size < 7
    );
  }

  getSeriesKey(candidate: FixedTaskTemplateDocument): string {
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
    today: { weekday: number; persianDay: number },
  ): boolean {
    if (recurrence === FixedTaskRecurrence.DAILY) {
      return true;
    }

    if (recurrence === FixedTaskRecurrence.WEEKLY) {
      return today.weekday === 6;
    }

    return today.persianDay === 1;
  }

  private shouldRunConfiguredSchedule(
    candidate: FixedTaskTemplateDocument,
    today: { weekday: number; persianDay: number },
  ): boolean {
    const config = candidate.scheduleConfig;

    if (candidate.recurrence === FixedTaskRecurrence.MONTHLY) {
      return Boolean(config?.monthDays?.includes(today.persianDay));
    }

    return Boolean(config?.weekdays?.includes(today.weekday));
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

    const nextDay = monthDays.find((day) => day > today.persianDay);
    if (nextDay) {
      const safeDay = this.clampPersianDayToMonth(
        today.persianYear,
        today.persianMonth,
        nextDay,
      );
      return tehranPersianDateTimeToUtc(
        today.persianYear,
        today.persianMonth,
        safeDay,
      );
    }

    const nextMonth =
      today.persianMonth === 12 ? 1 : today.persianMonth + 1;
    const nextYear =
      today.persianMonth === 12
        ? today.persianYear + 1
        : today.persianYear;
    const firstConfiguredDay = monthDays[0] ?? today.persianDay;
    const safeDay = this.clampPersianDayToMonth(
      nextYear,
      nextMonth,
      firstConfiguredDay,
    );

    return tehranPersianDateTimeToUtc(nextYear, nextMonth, safeDay);
  }

  private clampPersianDayToMonth(
    year: number,
    month: number,
    day: number,
  ): number {
    return Math.min(day, getPersianMonthLength(year, month));
  }

  private getTehranCalendar(date: Date) {
    const parts = getTehranDateParts(date);
    const persianParts = getTehranPersianDateParts(date);
    const calendarDate = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day),
    );

    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      weekday: calendarDate.getUTCDay(),
      persianYear: persianParts.year,
      persianMonth: persianParts.month,
      persianDay: persianParts.day,
    };
  }
}
