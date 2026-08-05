import { Connection, Types } from 'mongoose';
import { UserProgressRepository } from './user-progress.repository';

describe('UserProgressRepository', () => {
  it('loads tasks overlapping today and active fixed-task occurrences that start today', async () => {
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
      startDate: { $lte: periodEnd },
      endDate: { $type: 'date', $gte: periodStart },
    });
    expect(collection).toHaveBeenCalledWith('fixedtasktemplates');
    expect(find).toHaveBeenCalledWith({
      assignedTo: userId,
      isActive: true,
      isTemplate: { $ne: true },
      startDate: { $gte: periodStart, $lt: periodEnd },
    });
  });
});
