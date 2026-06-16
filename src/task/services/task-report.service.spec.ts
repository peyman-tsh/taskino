import { Types } from 'mongoose';
import { TaskRepository } from '../repositories/task.repository';
import { TaskStatus } from '../task.schema';
import { TaskPolicyService } from './task-policy.service';
import { TaskReportService } from './task-report.service';
import { TaskScoreService } from './task-score.service';

describe('TaskReportService', () => {
  const repository = {
    count: jest.fn(),
  };
  const taskPolicy = {
    validateObjectId: jest.fn(),
  };
  const taskScoreService = {};
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

    await expect(service.getTaskStatusOverviewByAssignee(userId)).resolves.toEqual({
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
});
