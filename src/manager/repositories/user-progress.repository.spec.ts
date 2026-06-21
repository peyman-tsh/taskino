import { Connection, Types } from 'mongoose';
import { UserProgressRepository } from './user-progress.repository';

describe('UserProgressRepository', () => {
  it('loads all current-month fixed-task occurrences regardless of active state', async () => {
    const toArray = jest.fn().mockResolvedValue([]);
    const project = jest.fn().mockReturnValue({ toArray });
    const find = jest.fn().mockReturnValue({ project });
    const collection = jest.fn().mockReturnValue({ find });
    const repository = new UserProgressRepository({
      collection,
    } as unknown as Connection);
    const userId = new Types.ObjectId();
    const periodStart = new Date(2026, 5, 1);
    const periodEnd = new Date(2026, 6, 1);
    const monthlyFilter = {
      $or: [
        { startDate: { $gte: periodStart, $lt: periodEnd } },
        {
          startDate: null,
          createdAt: { $gte: periodStart, $lt: periodEnd },
        },
      ],
    };

    await repository.findAssignedWork(userId, periodStart, periodEnd);

    expect(collection).toHaveBeenCalledWith('tasks');
    expect(find).toHaveBeenCalledWith({
      assignedTo: userId,
      ...monthlyFilter,
    });
    expect(collection).toHaveBeenCalledWith('fixedtasktemplates');
    expect(find).toHaveBeenCalledWith({
      assignedTo: userId,
      ...monthlyFilter,
    });
  });
});
