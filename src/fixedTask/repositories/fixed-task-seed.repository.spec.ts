import { Connection, Types } from 'mongoose';
import { FixedTaskRecurrence } from '../fixed-task.schema';
import { FixedTaskSeedRepository } from './fixed-task-seed.repository';

describe('FixedTaskSeedRepository', () => {
  it('stores seeded fixed tasks as active', async () => {
    const updateOne = jest.fn().mockResolvedValue({ upsertedCount: 1 });
    const collection = jest.fn().mockReturnValue({ updateOne });
    const repository = new FixedTaskSeedRepository({
      collection,
    } as unknown as Connection);
    const now = new Date();

    await repository.upsertFixedTask(
      {
        title: 'Daily report',
        recurrence: FixedTaskRecurrence.DAILY,
        description: 'Description',
        nextRunAt: now,
        startDate: now,
        startTime: '10:00',
        endDate: new Date(now.getTime() + 86_400_000),
        endTime: '00:01',
        sourceExcel: 'source.xlsx',
        sourceSheet: 'Sheet',
        sourceRow: 2,
      },
      new Types.ObjectId(),
      new Types.ObjectId(),
    );

    expect(updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({ isActive: true }),
      }),
      { upsert: true },
    );
  });
});
