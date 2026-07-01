export const TEHRAN_TIME_ZONE = 'Asia/Tehran';

export interface TehranDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface TehranPersianDateParts extends TehranDateParts {}

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

const tehranPersianFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TEHRAN_TIME_ZONE,
  calendar: 'persian',
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

export function getTehranPersianDateParts(
  date: Date,
): TehranPersianDateParts {
  const values = Object.fromEntries(
    tehranPersianFormatter
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

export function addTehranPersianCalendarMonths(
  date: Date,
  months: number,
): { year: number; month: number; day: number } {
  const current = getTehranPersianDateParts(date);
  const monthIndex = current.month - 1 + months;
  const year = current.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  const day = Math.min(current.day, getPersianMonthLength(year, month));

  return { year, month, day };
}

export function tehranPersianDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const gregorian = persianToGregorian(year, month, day);
  return tehranDateTimeToUtc(
    gregorian.year,
    gregorian.month,
    gregorian.day,
    hour,
    minute,
    second,
    millisecond,
  );
}

export function getPersianMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isPersianLeapYear(year) ? 30 : 29;
}

function isPersianLeapYear(year: number): boolean {
  return persianToGregorian(year + 1, 1, 1).dayDifference(
    persianToGregorian(year, 1, 1),
  ) === 366;
}

function persianToGregorian(
  persianYear: number,
  persianMonth: number,
  persianDay: number,
): { year: number; month: number; day: number; dayDifference: (other: { year: number; month: number; day: number }) => number } {
  let year = persianYear + 1595;
  let days =
    -355668 +
    365 * year +
    Math.floor(year / 33) * 8 +
    Math.floor(((year % 33) + 3) / 4) +
    persianDay +
    (persianMonth < 7
      ? (persianMonth - 1) * 31
      : (persianMonth - 7) * 30 + 186);

  let gregorianYear = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gregorianYear += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }

  gregorianYear += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gregorianYear += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  const gregorianDay = days + 1;
  const monthDays = [
    0,
    31,
    isGregorianLeapYear(gregorianYear) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  let gregorianMonth = 1;
  let day = gregorianDay;
  while (gregorianMonth <= 12 && day > monthDays[gregorianMonth]) {
    day -= monthDays[gregorianMonth];
    gregorianMonth += 1;
  }

  const result = {
    year: gregorianYear,
    month: gregorianMonth,
    day,
    dayDifference: (other: { year: number; month: number; day: number }) =>
      Math.round(
        (Date.UTC(result.year, result.month - 1, result.day) -
          Date.UTC(other.year, other.month - 1, other.day)) /
          86400000,
      ),
  };

  return result;
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
