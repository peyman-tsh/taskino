import { Types } from 'mongoose';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskStatus } from '../fixed-task.schema';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';

describe('FixedTaskQueryService', () => {
  const repository = {
    findPaginated: jest.fn(),
    count: jest.fn(),
    findActive: jest.fn(),
  };
  const policy = {
    parseDate: jest.fn((value: string) => new Date(value)),
    assertValidDateRange: jest.fn(),
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
  };
  const service = new FixedTaskQueryService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('filters fixed tasks that overlap the requested date range', async () => {
    const startDate = '2026-06-01T00:00:00.000Z';
    const endDate = '2026-06-30T23:59:59.000Z';
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    await service.findAll({
      page: 1,
      limit: 10,
      status: FixedTaskStatus.IN_PROGRESS,
      startDate,
      endDate,
    });

    expect(repository.findPaginated).toHaveBeenCalledWith(
      {
        status: FixedTaskStatus.IN_PROGRESS,
        endDate: { $gte: new Date(startDate) },
        startDate: { $lte: new Date(endDate) },
      },
      1,
      10,
    );
  });

  it('returns fixed task counts grouped by status', async () => {
    repository.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);

    await expect(service.getStatusCounts()).resolves.toEqual({
      totalFixedTasks: 10,
      todoFixedTasks: 3,
      inProgressFixedTasks: 2,
      doneFixedTasks: 5,
      activeDatedTodoFixedTasks: 1,
    });
    expect(repository.count).toHaveBeenLastCalledWith({
      status: FixedTaskStatus.TODO,
      startDate: { $type: 'date' },
      endDate: { $type: 'date', $gte: expect.any(Date) },
    });
  });

  it('returns all active fixed tasks when name is not provided', async () => {
    repository.findActive.mockResolvedValue([{ isActive: true }]);

    await expect(service.findActiveTemplates()).resolves.toEqual([
      { isActive: true },
    ]);
    expect(repository.findActive).toHaveBeenCalledWith({ isActive: true });
  });

  it('filters active fixed tasks by assigned user ID when provided', async () => {
    const userId = new Types.ObjectId();
    repository.findActive.mockResolvedValue([{ isActive: true }]);

    await service.findActiveTemplates(userId.toString());

    expect(repository.findActive).toHaveBeenCalledWith({
      isActive: true,
      assignedTo: userId,
    });
  });
});
