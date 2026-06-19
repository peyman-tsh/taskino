import { Connection, Types } from 'mongoose';
import { FixedTaskRecurrence } from '../fixed-task.schema';
import { UserRole } from '../../user/schemas/user.schema';
import { FixedTaskSeedRepository } from './fixed-task-seed.repository';

describe('FixedTaskSeedRepository', () => {
  it('identifies seeded users by mobile and allows duplicate emails', async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
    });
    const collection = jest.fn().mockReturnValue({ findOneAndUpdate });
    const repository = new FixedTaskSeedRepository({
      collection,
    } as unknown as Connection);

    await repository.upsertUser(
      {
        firstName: 'Ali',
        lastName: 'Ahmadi',
        email: 'shared@example.com',
        mobile: '09120000000',
        role: UserRole.SPECIALIST,
      },
      'hashed-password',
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { mobile: '09120000000' },
      expect.objectContaining({
        $set: expect.objectContaining({
          email: 'shared@example.com',
          mobile: '09120000000',
        }),
      }),
      { upsert: true, returnDocument: 'after' },
    );
  });

  it('inserts every seeded fixed task as a new active document', async () => {
    const insertOne = jest.fn().mockResolvedValue({ insertedId: new Types.ObjectId() });
    const collection = jest.fn().mockReturnValue({
      insertOne,
    });
    const repository = new FixedTaskSeedRepository({
      collection,
    } as unknown as Connection);
    const now = new Date();

    await repository.insertFixedTask(
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

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        status: 'todo',
        scoreAdjusted: false,
        sourceExcel: 'source.xlsx',
        sourceSheet: 'Sheet',
        sourceRow: expect.any(Number),
        originalSourceRow: 2,
      }),
    );
    expect(insertOne.mock.calls[0][0].sourceRow).toBeLessThan(0);
  });
});
