import { FixedTaskRecurrence } from '../fixed-task.schema';
import { buildFixedTaskSeedSchedule } from './fixed-task-seed.service';

describe('buildFixedTaskSeedSchedule', () => {
  const now = new Date(2026, 5, 19, 14, 35, 20);

  it.each([
    [FixedTaskRecurrence.DAILY, new Date(2026, 5, 20, 0, 0, 0, 0)],
    [FixedTaskRecurrence.WEEKLY, new Date(2026, 5, 26, 0, 0, 0, 0)],
    [FixedTaskRecurrence.MONTHLY, new Date(2026, 6, 19, 0, 0, 0, 0)],
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
    const januaryLastDay = new Date(2026, 0, 31, 9, 15);

    const schedule = buildFixedTaskSeedSchedule(
      FixedTaskRecurrence.MONTHLY,
      januaryLastDay,
    );

    expect(schedule.endDate).toEqual(new Date(2026, 1, 28, 0, 0, 0, 0));
  });
});
