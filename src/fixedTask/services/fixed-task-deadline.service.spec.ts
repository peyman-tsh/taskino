import { FixedTaskRecurrence } from '../fixed-task.schema';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';

describe('FixedTaskDeadlineService', () => {
  const service = new FixedTaskDeadlineService();

  it('creates a daily deadline using the scheduled endTime', () => {
    const now = new Date(2026, 5, 12, 10, 0);

    expect(
      service.getNextDeadline(FixedTaskRecurrence.DAILY, '14:30', now),
    ).toEqual(new Date(2026, 5, 12, 14, 30));
  });
});
