import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from './fixed-task.repository';

describe('FixedTaskRepository rollover', () => {
  it('uses returnDocument after when claiming an expired occurrence', async () => {
    const exec = jest.fn();
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec });
    const repository = new FixedTaskRepository({
      findOneAndUpdate,
    } as unknown as Model<FixedTaskTemplateDocument>);
    const id = new Types.ObjectId();
    const generatedAt = new Date();

    repository.claimExpiredOccurrence(id, generatedAt);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, isActive: true },
      {
        $set: {
          isActive: false,
          lastGeneratedAt: generatedAt,
        },
      },
      { returnDocument: 'after' },
    );
  });

  it('creates a unique numeric source row for the next occurrence', async () => {
    const save = jest.fn().mockResolvedValue({});
    const model = jest.fn().mockImplementation((data) => ({ ...data, save }));
    const repository = new FixedTaskRepository(
      model as unknown as Model<FixedTaskTemplateDocument>,
    );
    const previous = {
      _id: new Types.ObjectId(),
      title: 'Daily report',
      assignedTo: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
      recurrence: FixedTaskRecurrence.DAILY,
      description: 'Description',
      status: FixedTaskStatus.DONE,
      sourceExcel: 'source.xlsx',
      sourceSheet: 'Sheet',
      sourceRow: 2,
    } as FixedTaskTemplateDocument;

    await repository.createNextOccurrence(previous, {
      startDate: new Date(),
      startTime: '10:00',
      endDate: new Date(),
      endTime: '00:01',
    });

    expect(model).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceExcel: 'source.xlsx',
        sourceSheet: 'Sheet',
        sourceRow: expect.any(Number),
      }),
    );
    expect(model.mock.calls[0][0].sourceRow).toBeLessThan(0);
  });
});
