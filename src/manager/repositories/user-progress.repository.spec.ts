import { Connection, Types } from 'mongoose';
import { FixedTaskRecurrence } from '../../fixedTask/fixed-task.schema';
import { UserProgressRepository } from './user-progress.repository';

describe('UserProgressRepository', () => {
  it('loads today-window tasks and active fixed tasks scheduled for today', async () => {
    const toArray = jest.fn().mockResolvedValue([]);
    const project = jest.fn().mockReturnValue({ toArray });
    const find = jest.fn().mockReturnValue({ project });
    const collection = jest.fn().mockReturnValue({ find });
    const repository = new UserProgressRepository({
      collection,
    } as unknown as Connection);
    const userId = new Types.ObjectId();
    const periodStart = new Date('2026-07-06T20:30:00.000Z');
    const periodEnd = new Date('2026-07-07T20:30:00.000Z');

    await repository.findAssignedWork(userId, periodStart, periodEnd);

    expect(collection).toHaveBeenCalledWith('tasks');
    expect(find).toHaveBeenCalledWith({
      assignedTo: userId,
      startDate: { $gte: periodStart, $lt: periodEnd },
      endDate: { $type: 'date', $lte: periodEnd },
    });
    expect(collection).toHaveBeenCalledWith('fixedtasktemplates');
    expect(find).toHaveBeenCalledWith({
      assignedTo: userId,
      isActive: true,
      $or: [
        {
          recurrence: FixedTaskRecurrence.DAILY,
          'scheduleConfig.weekdays': expect.any(Number),
        },
        {
          recurrence: FixedTaskRecurrence.WEEKLY,
          'scheduleConfig.weekdays': expect.any(Number),
        },
        {
          recurrence: FixedTaskRecurrence.MONTHLY,
          'scheduleConfig.monthDays': expect.any(Number),
        },
      ],
    });
  });
});
