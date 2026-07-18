import { Types } from 'mongoose';
import { TaskRepository } from '../repositories/task.repository';
import { TaskStatus } from '../task.schema';
import { TaskPolicyService } from './task-policy.service';
import { TaskReportService } from './task-report.service';
import { TaskScoreService } from './task-score.service';

describe('TaskReportService', () => {
  const repository = {
    count: jest.fn(),
    find: jest.fn(),
  };
  const taskPolicy = {
    validateObjectId: jest.fn(),
  };
  const taskScoreService = {
    adjustUserScore: jest.fn(),
  };
  const service = new TaskReportService(
    repository as unknown as TaskRepository,
    taskPolicy as unknown as TaskPolicyService,
    taskScoreService as unknown as TaskScoreService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns task status counts for one assignee', async () => {
    const userId = new Types.ObjectId().toString();
    repository.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(
      service.getTaskStatusOverviewByAssignee(userId),
    ).resolves.toEqual({
      userId,
      totalTasks: 2,
      todoTasks: 1,
      inProgressTasks: 0,
      doneTasks: 1,
    });
    expect(repository.count).toHaveBeenNthCalledWith(1, {
      assignedTo: expect.any(Types.ObjectId),
    });
    expect(repository.count).toHaveBeenNthCalledWith(2, {
      assignedTo: expect.any(Types.ObjectId),
      status: TaskStatus.TODO,
    });
    expect(repository.count).toHaveBeenNthCalledWith(3, {
      assignedTo: expect.any(Types.ObjectId),
      status: TaskStatus.IN_PROGRESS,
    });
    expect(repository.count).toHaveBeenNthCalledWith(4, {
      assignedTo: expect.any(Types.ObjectId),
      status: TaskStatus.DONE,
    });
  });

  it('filters a specialist tasks by startDate without considering dueDate', async () => {
    const userId = new Types.ObjectId().toString();
    repository.find.mockResolvedValue([
      { status: TaskStatus.TODO },
      { status: TaskStatus.IN_PROGRESS },
      { status: TaskStatus.DONE },
    ]);

    const result = await service.findTasksByUserAndCount({
      userId,
      startdate: '2026-07-01',
      enddate: '2026-07-31',
    });

    expect(repository.find).toHaveBeenCalledWith({
      assignedTo: expect.any(Types.ObjectId),
      startDate: {
        $gte: new Date('2026-07-01T00:00:00.000Z'),
        $lte: new Date('2026-07-31T23:59:59.999Z'),
      },
    });
    expect(result).toEqual({
      userId,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      todoTasks: 1,
      totalTasks: 3,
      completedTasks: 1,
      pendingTasks: 2,
    });
  });
});
