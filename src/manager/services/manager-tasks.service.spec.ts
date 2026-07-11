import { TaskRecurrence } from '../../task/task.schema';
import { ManagerTasksRepository } from '../repositories/manager-tasks.repository';
import { ManagerTasksService } from './manager-tasks.service';

describe('ManagerTasksService', () => {
  const repository = {
    findAll: jest.fn(),
    sumDoneWorkDurationForBalance: jest.fn(),
  };
  const service = new ManagerTasksService(
    repository as unknown as ManagerTasksRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all regular and fixed tasks with totals', async () => {
    repository.findAll.mockResolvedValue({
      tasks: [{ _id: 'task-1' }, { _id: 'task-2' }],
      fixedTasks: [{ _id: 'fixed-task-1' }],
    });

    const result = await service.findAll({
      recurrence: TaskRecurrence.WEEKLY,
    });

    expect(repository.findAll).toHaveBeenCalledWith(TaskRecurrence.WEEKLY);
    expect(result.total).toBe(3);
    expect(result.totalTasks).toBe(2);
    expect(result.totalFixedTasks).toBe(1);
  });

  it('returns daily fixed task duration balance', async () => {
    repository.sumDoneWorkDurationForBalance.mockResolvedValue(360);

    const result = await service.getDailyFixedTaskDurationBalance(
      '2026-06-01',
      '2026-06-30',
    );

    expect(
      repository.sumDoneWorkDurationForBalance,
    ).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), undefined);
    expect(result.expectedDailyMinutes).toBe(480);
    expect(result.totalActualDurationMinutes).toBe(360);
    expect(result.remainingMinutes).toBe(120);
  });

  it('does not return negative remaining daily duration', async () => {
    repository.sumDoneWorkDurationForBalance.mockResolvedValue(600);

    const result = await service.getDailyFixedTaskDurationBalance(
      '2026-06-01',
      '2026-06-30',
    );

    expect(result.remainingMinutes).toBe(0);
  });
});
