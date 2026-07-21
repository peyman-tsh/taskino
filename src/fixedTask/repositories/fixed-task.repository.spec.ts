import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';
import { FixedTaskRepository } from './fixed-task.repository';

describe('FixedTaskRepository rollover', () => {
  it('finds active done fixed tasks for a user inside a startDate range whose endDate has not passed', async () => {
    const query = {
      sort: jest.fn(),
      populate: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    };
    query.sort.mockReturnValue(query);
    query.populate.mockReturnValue(query);
    const find = jest.fn().mockReturnValue(query);
    const repository = new FixedTaskRepository({
      find,
    } as unknown as Model<FixedTaskTemplateDocument>);
    const userId = new Types.ObjectId();
    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-07-31T23:59:59.999Z');
    const evaluatedAt = new Date('2026-07-15T08:00:00.000Z');

    const result = await repository.findDoneByUserInDateRange(
      userId,
      from,
      to,
      evaluatedAt,
    );

    expect(find).toHaveBeenCalledWith({
      assignedTo: userId,
      status: FixedTaskStatus.DONE,
      isActive: true,
      endDate: { $type: 'date', $gte: evaluatedAt },
      startDate: { $gte: from, $lte: to },
    });
    expect(query.sort).toHaveBeenCalledWith({ startDate: -1, _id: -1 });
    expect(result).toEqual([]);
  });

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

  it('deactivates active occurrences outside the newly generated day', () => {
    const exec = jest.fn();
    const updateMany = jest.fn().mockReturnValue({ exec });
    const repository = new FixedTaskRepository({
      updateMany,
    } as unknown as Model<FixedTaskTemplateDocument>);
    const startDate = new Date('2026-07-18T20:30:00.000Z');

    repository.deactivateActiveOccurrencesOutsideDay(startDate);

    expect(updateMany).toHaveBeenCalledWith(
      {
        isActive: true,
        startDate: { $ne: startDate },
      },
      { $set: { isActive: false } },
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
        originalSourceRow: 2,
      }),
    );
    expect(model.mock.calls[0][0].sourceRow).toBeLessThan(0);
  });

  it('inherits only manager-approved timing into the next occurrence', async () => {
    const save = jest.fn().mockResolvedValue({});
    const model = jest.fn().mockImplementation((data) => ({ ...data, save }));
    const repository = new FixedTaskRepository(
      model as unknown as Model<FixedTaskTemplateDocument>,
    );
    const managerId = new Types.ObjectId();
    const previous = {
      _id: new Types.ObjectId(),
      title: 'Daily report',
      assignedTo: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
      recurrence: FixedTaskRecurrence.DAILY,
      status: FixedTaskStatus.DONE,
      timingApprovalStatus: FixedTaskTimingApprovalStatus.APPROVED,
      approvedDurationMinutes: 225,
      startTime: '08:00',
      endTime: '11:45',
      timingApprovedBy: managerId,
      timingApprovedAt: new Date(),
    } as FixedTaskTemplateDocument;

    await repository.createNextOccurrence(previous, {
      startDate: new Date(),
      startTime: '00:01',
      endDate: new Date(),
      endTime: '00:01',
    });

    expect(model).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: '08:00',
        endTime: '11:45',
        approvedDurationMinutes: 225,
        timingApprovalStatus: FixedTaskTimingApprovalStatus.APPROVED,
        timingApprovedBy: managerId,
        startedAt: null,
        actualDurationMinutes: null,
      }),
    );
  });

  it('creates empty timing when the previous timing was rejected', async () => {
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
      status: FixedTaskStatus.DONE,
      timingApprovalStatus: FixedTaskTimingApprovalStatus.REJECTED,
      startTime: '08:00',
      endTime: '11:45',
      actualDurationMinutes: 225,
    } as FixedTaskTemplateDocument;

    await repository.createNextOccurrence(previous, {
      startDate: new Date(),
      startTime: '00:01',
      endDate: new Date(),
      endTime: '00:01',
    });

    expect(model).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: null,
        endTime: null,
        approvedDurationMinutes: null,
        timingApprovalStatus: FixedTaskTimingApprovalStatus.PENDING,
        startedAt: null,
        actualDurationMinutes: null,
      }),
    );
  });
});
