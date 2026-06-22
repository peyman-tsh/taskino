import { FixedTaskRecurrence } from '../fixed-task.schema';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';

describe('FixedTaskDeadlineService', () => {
  const service = new FixedTaskDeadlineService();

  it('creates a daily deadline using Tehran time', () => {
    const now = new Date('2026-06-12T06:30:00.000Z');

    expect(
      service.getNextDeadline(FixedTaskRecurrence.DAILY, '14:30', now),
    ).toEqual(new Date('2026-06-12T11:00:00.000Z'));
  });

  it('combines endDate and endTime in Tehran timezone', () => {
    const deadline = service.getScoreDeadline({
      endDate: new Date('2026-06-19T20:30:00.000Z'),
      endTime: '00:01',
    } as never);

    expect(deadline).toEqual(new Date('2026-06-19T20:31:00.000Z'));
  });
});
