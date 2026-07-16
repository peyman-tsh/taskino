import { Injectable } from '@nestjs/common';
import {
  FixedTaskRecurrence,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { buildFixedTaskSeedSchedule } from './fixed-task-seed.service';
import {
  addTehranCalendarPeriod,
  getTehranDateParts,
  getTehranPersianDateParts,
  tehranDateTimeToUtc,
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

    // Every rollover creates a one-day occurrence. The recurrence controls
    // which days create an occurrence, not how long that occurrence remains open.
    const today = this.getTehranCalendar(now);
    const tomorrow = addTehranCalendarPeriod(now, 1, 0);
    schedule.startDate = tehranDateTimeToUtc(
      today.year,
      today.month,
      today.day,
    );
    schedule.startTime = '00:00';
    schedule.endDate = tehranDateTimeToUtc(
      tomorrow.year,
      tomorrow.month,
      tomorrow.day,
    );
    schedule.endTime = '00:00';

    return schedule;
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
      persianDay: persianParts.day,
    };
  }
}
