import { BadRequestException } from '@nestjs/common';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import {
  addTehranCalendarPeriod,
  getTehranDateParts,
  tehranDateTimeToUtc,
} from './tehran-time.util';

export interface DailyProgressRecord {
  date: Date;
  totalTasks?: number;
  completedTasks?: number;
  totalFixedTasks?: number;
  completedFixedTasks?: number;
  taskProgressPercentage?: number;
  fixedTaskProgressPercentage?: number;
  progressPercentage?: number;
  performanceStatus?: UserPerformanceStatus;
  evaluatedAt?: Date;
}

export function parseTehranDayBoundary(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date range');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return tehranDateTimeToUtc(year, month, day);
  }

  const parts = getTehranDateParts(date);
  return tehranDateTimeToUtc(parts.year, parts.month, parts.day);
}

export function getTehranDayRange(date: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const today = getTehranDateParts(date);
  const tomorrow = addTehranCalendarPeriod(date, 1, 0);

  return {
    periodStart: tehranDateTimeToUtc(today.year, today.month, today.day),
    periodEnd: tehranDateTimeToUtc(
      tomorrow.year,
      tomorrow.month,
      tomorrow.day,
    ),
  };
}

export function buildDailyProgressRange(
  from: Date,
  to: Date,
  records: DailyProgressRecord[],
): {
  dayCount: number;
  averageProgressPercentage: number;
  data: DailyProgressRecord[];
} {
  const recordsByDay = new Map(
    records.map((record) => [record.date.toISOString(), record]),
  );
  const data: DailyProgressRecord[] = [];

  for (let current = new Date(from); current <= to; ) {
    const existing = recordsByDay.get(current.toISOString());
    data.push(existing ?? createEmptyDailyProgress(current));
    const next = addTehranCalendarPeriod(current, 1, 0);
    current = tehranDateTimeToUtc(next.year, next.month, next.day);
  }

  const totalProgress = data.reduce(
    (sum, record) => sum + (record.progressPercentage ?? 0),
    0,
  );
  const dayCount = data.length;

  return {
    dayCount,
    averageProgressPercentage:
      dayCount === 0 ? 0 : Math.round(totalProgress / dayCount),
    data,
  };
}

function createEmptyDailyProgress(date: Date): DailyProgressRecord {
  return {
    date,
    totalTasks: 0,
    completedTasks: 0,
    totalFixedTasks: 0,
    completedFixedTasks: 0,
    taskProgressPercentage: 0,
    fixedTaskProgressPercentage: 0,
    progressPercentage: 0,
    performanceStatus: UserPerformanceStatus.WEAK,
  };
}
