import { FixedTaskRecurrence } from '../fixed-task.schema';
import {
  buildFixedTaskSeedSchedule,
  buildInitialFixedTaskSeedSchedule,
} from './fixed-task-seed.service';

describe('buildFixedTaskSeedSchedule', () => {
  const now = new Date('2026-06-19T11:05:20.000Z');

  it.each([
    [FixedTaskRecurrence.DAILY, new Date('2026-06-19T20:30:00.000Z')],
    [FixedTaskRecurrence.WEEKLY, new Date('2026-06-25T20:30:00.000Z')],
    [FixedTaskRecurrence.MONTHLY, new Date('2026-07-19T20:30:00.000Z')],
  ])('builds %s seed schedule', (recurrence, expectedEndDate) => {
    const schedule = buildFixedTaskSeedSchedule(recurrence, now);
    const expectedStartDate =
      recurrence === FixedTaskRecurrence.DAILY
        ? new Date('2026-06-18T20:30:00.000Z')
        : now;
    const expectedTime =
      recurrence === FixedTaskRecurrence.DAILY ? '00:00' : '14:35';
    const expectedEndTime =
      recurrence === FixedTaskRecurrence.DAILY ? '00:00' : '00:01';

    expect(schedule).toEqual({
      startDate: expectedStartDate,
      startTime: expectedTime,
      endDate: expectedEndDate,
      endTime: expectedEndTime,
    });
  });

  it('clamps monthly end date to the last valid day of the next month', () => {
    const januaryLastDay = new Date('2026-01-31T05:45:00.000Z');

    const schedule = buildFixedTaskSeedSchedule(
      FixedTaskRecurrence.MONTHLY,
      januaryLastDay,
    );

    expect(schedule.endDate).toEqual(
      new Date('2026-03-01T20:30:00.000Z'),
    );
  });

  it('leaves startTime and endTime empty for the initial Excel seed', () => {
    const schedule = buildInitialFixedTaskSeedSchedule(
      FixedTaskRecurrence.DAILY,
      now,
    );

    expect(schedule).toEqual({
      startDate: new Date('2026-06-18T20:30:00.000Z'),
      startTime: null,
      endDate: new Date('2026-06-19T20:30:00.000Z'),
      endTime: null,
    });
  });
});
