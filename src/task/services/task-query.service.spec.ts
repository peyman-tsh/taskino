import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TaskRepository } from '../repositories/task.repository';
import { TaskRecurrence } from '../task.schema';
import { TaskPolicyService } from './task-policy.service';
import { TaskQueryService } from './task-query.service';
import { TaskScoreService } from './task-score.service';

describe('TaskQueryService', () => {
  const repository = {
    findPaginated: jest.fn(),
  };
  const policy = {
    parseDateTime: jest.fn((value: string) => new Date(value)),
  };
  const scoreService = {
    adjustOverdueTasks: jest.fn(),
  };
  const service = new TaskQueryService(
    repository as unknown as TaskRepository,
    policy as unknown as TaskPolicyService,
    scoreService as unknown as TaskScoreService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });
  });

  it('builds recurrence and date range filters', async () => {
    const startDate = '2026-06-01T00:00:00.000Z';
    const endDate = '2026-06-30T23:59:59.000Z';

    await service.findAll(2, 20, {
      recurrence: TaskRecurrence.MONTHLY,
      startDate,
      endDate,
    });

    expect(scoreService.adjustOverdueTasks).toHaveBeenCalled();
    expect(repository.findPaginated).toHaveBeenCalledWith(
      {
        recurrence: TaskRecurrence.MONTHLY,
        dueDate: { $gte: new Date(startDate) },
        startDate: { $lte: new Date(endDate) },
      },
      2,
      20,
    );
  });

  it('rejects an invalid date range', async () => {
    await expect(
      service.findAll(1, 10, {
        startDate: '2026-06-30T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns only public tasks with a non-expired due date', async () => {
    await service.findActivePublicTasks(1, 10);

    expect(repository.findPaginated).toHaveBeenCalledWith(
      {
        isPublic: true,
        endDate: { $type: 'date', $gte: expect.any(Date) },
      },
      1,
      10,
    );
  });
});
