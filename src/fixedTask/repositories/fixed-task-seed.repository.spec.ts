import { Connection, Types } from 'mongoose';
import { FixedTaskRecurrence } from '../fixed-task.schema';
import { FixedTaskSeedRepository } from './fixed-task-seed.repository';

describe('FixedTaskSeedRepository', () => {
  it('inserts every seeded fixed task as a new active document', async () => {
    const insertOne = jest.fn().mockResolvedValue({ insertedId: new Types.ObjectId() });
    const indexes = jest.fn().mockResolvedValue([]);
    const createIndex = jest.fn().mockResolvedValue(
      'sourceExcel_1_sourceSheet_1_sourceRow_1',
    );
    const collection = jest.fn().mockReturnValue({
      insertOne,
      indexes,
      createIndex,
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
        sourceRow: 2,
      }),
    );
  });

  it('replaces the old unique source index before inserting duplicates', async () => {
    const insertOne = jest.fn().mockResolvedValue({ insertedId: new Types.ObjectId() });
    const indexes = jest.fn().mockResolvedValue([
      {
        name: 'sourceExcel_1_sourceSheet_1_sourceRow_1',
        unique: true,
      },
    ]);
    const dropIndex = jest.fn();
    const createIndex = jest.fn();
    const collection = jest.fn().mockReturnValue({
      insertOne,
      indexes,
      dropIndex,
      createIndex,
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

    expect(dropIndex).toHaveBeenCalledWith(
      'sourceExcel_1_sourceSheet_1_sourceRow_1',
    );
    expect(createIndex).toHaveBeenCalledWith(
      { sourceExcel: 1, sourceSheet: 1, sourceRow: 1 },
      { name: 'sourceExcel_1_sourceSheet_1_sourceRow_1' },
    );
    expect(insertOne).toHaveBeenCalled();
  });
});
