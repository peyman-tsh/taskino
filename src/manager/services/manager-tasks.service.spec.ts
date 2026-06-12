import { TaskRecurrence } from '../../task/task.schema';
import { ManagerTasksRepository } from '../repositories/manager-tasks.repository';
import { ManagerTasksService } from './manager-tasks.service';

describe('ManagerTasksService', () => {
  const repository = {
    findAll: jest.fn(),
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
});
