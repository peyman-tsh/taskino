import { BadRequestException } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { ManagerWorkStatusRepository } from '../repositories/manager-work-status.repository';
import { ManagerWorkStatusService } from './manager-work-status.service';

describe('ManagerWorkStatusService', () => {
  const repository = {
    findByDateRange: jest.fn(),
  };
  const service = new ManagerWorkStatusService(
    repository as unknown as ManagerWorkStatusRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns mutually exclusive combined and per-type counts', async () => {
    const future = new Date(Date.now() + 86_400_000);
    const expired = new Date(Date.now() - 86_400_000);
    repository.findByDateRange.mockResolvedValue({
      tasks: [
        { status: TaskStatus.DONE },
        { status: TaskStatus.IN_PROGRESS, endDate: future },
        { status: TaskStatus.TODO, dueDate: future },
        { status: TaskStatus.TODO, endDate: expired },
      ],
      fixedTasks: [
        { status: FixedTaskStatus.DONE },
        { status: FixedTaskStatus.IN_PROGRESS, endDate: future },
        { status: FixedTaskStatus.TODO, endDate: expired },
      ],
    });

    const result = await service.getStatusCounts(
      '2026-06-01',
      '2026-06-30',
    );

    expect(result).toEqual(
      expect.objectContaining({
        total: 7,
        done: 2,
        inProgress: 2,
        todo: 1,
        overdueUnfinished: 2,
        tasks: {
          total: 4,
          done: 1,
          inProgress: 1,
          todo: 1,
          overdueUnfinished: 1,
        },
        fixedTasks: {
          total: 3,
          done: 1,
          inProgress: 1,
          todo: 0,
          overdueUnfinished: 1,
        },
      }),
    );
  });

  it('rejects an inverted date range', async () => {
    await expect(
      service.getStatusCounts('2026-06-30', '2026-06-01'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findByDateRange).not.toHaveBeenCalled();
  });
});
