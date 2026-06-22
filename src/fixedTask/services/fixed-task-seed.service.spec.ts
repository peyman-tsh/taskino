import { FixedTaskRecurrence } from '../fixed-task.schema';
import { buildFixedTaskSeedSchedule } from './fixed-task-seed.service';

describe('buildFixedTaskSeedSchedule', () => {
  const now = new Date('2026-06-19T11:05:20.000Z');

  it.each([
    [FixedTaskRecurrence.DAILY, new Date('2026-06-19T20:30:00.000Z')],
    [FixedTaskRecurrence.WEEKLY, new Date('2026-06-25T20:30:00.000Z')],
    [FixedTaskRecurrence.MONTHLY, new Date('2026-07-18T20:30:00.000Z')],
  ])('builds %s seed schedule', (recurrence, expectedEndDate) => {
    const schedule = buildFixedTaskSeedSchedule(recurrence, now);

    expect(schedule).toEqual({
      startDate: now,
      startTime: '14:35',
      endDate: expectedEndDate,
      endTime: '00:01',
    });
  });

  it('clamps monthly end date to the last valid day of the next month', () => {
    const januaryLastDay = new Date('2026-01-31T05:45:00.000Z');

    const schedule = buildFixedTaskSeedSchedule(
      FixedTaskRecurrence.MONTHLY,
      januaryLastDay,
    );

    expect(schedule.endDate).toEqual(
      new Date('2026-02-27T20:30:00.000Z'),
    );
  });
});
