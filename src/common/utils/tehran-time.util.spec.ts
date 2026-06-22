import {
  formatTehranTime,
  getTehranDateParts,
  tehranDateTimeToUtc,
} from './tehran-time.util';

describe('Tehran time utilities', () => {
  it('formats an instant using Tehran local time', () => {
    expect(formatTehranTime(new Date('2026-06-22T06:24:00.000Z'))).toBe(
      '09:54',
    );
  });

  it('converts Tehran midnight to its UTC instant', () => {
    expect(tehranDateTimeToUtc(2026, 6, 23)).toEqual(
      new Date('2026-06-22T20:30:00.000Z'),
    );
  });

  it('extracts the Tehran calendar date from a UTC instant', () => {
    expect(
      getTehranDateParts(new Date('2026-06-22T20:30:00.000Z')),
    ).toEqual({
      year: 2026,
      month: 6,
      day: 23,
      hour: 0,
      minute: 0,
      second: 0,
    });
  });
});
