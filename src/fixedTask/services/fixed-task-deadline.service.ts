import { Injectable } from '@nestjs/common';
import {
  FixedTaskRecurrence,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import {
  addTehranCalendarPeriod,
  getTehranDateParts,
  tehranDateTimeToUtc,
} from '../../common/utils/tehran-time.util';

@Injectable()
export class FixedTaskDeadlineService {
  getScoreDeadline(task: FixedTaskTemplateDocument): Date | null {
    if (!task.endDate) return null;

    return this.applyTehranTime(new Date(task.endDate), task.endTime);
  }

  getNextDeadline(
    recurrence: FixedTaskRecurrence,
    endTime?: string | null,
    now = new Date(),
  ): Date {
    if (recurrence === FixedTaskRecurrence.DAILY) {
      let deadline = this.applyTehranTime(now, endTime);
      if (deadline.getTime() <= now.getTime()) {
        const tomorrow = addTehranCalendarPeriod(now, 1, 0);
        deadline = this.createDeadline(tomorrow, endTime);
      }
      return deadline;
    }

    if (recurrence === FixedTaskRecurrence.WEEKLY) {
      const current = getTehranDateParts(now);
      const calendarDate = new Date(
        Date.UTC(current.year, current.month - 1, current.day),
      );
      const daysUntilFriday = (5 - calendarDate.getUTCDay() + 7) % 7;
      const target = addTehranCalendarPeriod(now, daysUntilFriday, 0);
      let deadline = this.createDeadline(target, endTime);
      if (deadline.getTime() <= now.getTime()) {
        const nextWeek = addTehranCalendarPeriod(deadline, 7, 0);
        deadline = this.createDeadline(nextWeek, endTime);
      }
      return deadline;
    }

    const current = getTehranDateParts(now);
    const lastDay = new Date(
      Date.UTC(current.year, current.month, 0),
    ).getUTCDate();
    let deadline = this.createDeadline(
      { year: current.year, month: current.month, day: lastDay },
      endTime,
    );
    if (deadline.getTime() <= now.getTime()) {
      const nextMonth = addTehranCalendarPeriod(now, 0, 1);
      const nextLastDay = new Date(
        Date.UTC(nextMonth.year, nextMonth.month, 0),
      ).getUTCDate();
      deadline = this.createDeadline(
        {
          year: nextMonth.year,
          month: nextMonth.month,
          day: nextLastDay,
        },
        endTime,
      );
    }
    return deadline;
  }

  private applyTehranTime(date: Date, time?: string | null): Date {
    const parts = getTehranDateParts(date);
    return this.createDeadline(parts, time);
  }

  private createDeadline(
    date: { year: number; month: number; day: number },
    time?: string | null,
  ): Date {
    const [hours, minutes] = time
      ? time.split(':').map(Number)
      : [23, 59];
    return tehranDateTimeToUtc(
      date.year,
      date.month,
      date.day,
      hours,
      minutes,
      time ? 0 : 59,
      time ? 0 : 999,
    );
  }
}
