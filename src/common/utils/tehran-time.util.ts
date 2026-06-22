export const TEHRAN_TIME_ZONE = 'Asia/Tehran';

export interface TehranDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const tehranFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TEHRAN_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function getTehranDateParts(date: Date): TehranDateParts {
  const values = Object.fromEntries(
    tehranFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function formatTehranTime(date: Date): string {
  const { hour, minute } = getTehranDateParts(date);
  return [hour, minute]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
}

export function tehranDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const targetTimestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  let utcTimestamp = targetTimestamp;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = getTehranDateParts(new Date(utcTimestamp));
    const actualTimestamp = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      millisecond,
    );
    utcTimestamp += targetTimestamp - actualTimestamp;
  }

  return new Date(utcTimestamp);
}

export function addTehranCalendarPeriod(
  date: Date,
  days: number,
  months: number,
): { year: number; month: number; day: number } {
  const current = getTehranDateParts(date);
  const calendarDate = new Date(
    Date.UTC(current.year, current.month - 1, current.day),
  );

  if (months > 0) {
    const originalDay = calendarDate.getUTCDate();
    calendarDate.setUTCDate(1);
    calendarDate.setUTCMonth(calendarDate.getUTCMonth() + months);
    const lastDay = new Date(
      Date.UTC(
        calendarDate.getUTCFullYear(),
        calendarDate.getUTCMonth() + 1,
        0,
      ),
    ).getUTCDate();
    calendarDate.setUTCDate(Math.min(originalDay, lastDay));
  }

  if (days > 0) {
    calendarDate.setUTCDate(calendarDate.getUTCDate() + days);
  }

  return {
    year: calendarDate.getUTCFullYear(),
    month: calendarDate.getUTCMonth() + 1,
    day: calendarDate.getUTCDate(),
  };
}
