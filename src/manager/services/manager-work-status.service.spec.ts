import { BadRequestException } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { ManagerWorkStatusRepository } from '../repositories/manager-work-status.repository';
import { ManagerWorkStatusService } from './manager-work-status.service';

describe('ManagerWorkStatusService', () => {
  const repository = {
    findByDateRange: jest.fn(),
    findByDateRangeForUsers: jest.fn(),
  };
  const service = new ManagerWorkStatusService(
    repository as unknown as ManagerWorkStatusRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns mutually exclusive combined and per-type counts', async () => {
    const futureInRange = new Date('2026-06-30T10:00:00.000Z');
    const expiredInRange = new Date('2026-06-12T10:00:00.000Z');
    const expiredOutsideRange = new Date('2026-05-12T10:00:00.000Z');
    repository.findByDateRange.mockResolvedValue({
      tasks: [
        {
          status: TaskStatus.DONE,
          startDate: new Date('2026-06-01T10:00:00.000Z'),
          endDate: new Date('2026-06-02T10:00:00.000Z'),
        },
        {
          status: TaskStatus.IN_PROGRESS,
          startDate: new Date('2026-06-10T10:00:00.000Z'),
          endDate: futureInRange,
        },
        {
          status: TaskStatus.TODO,
          startDate: new Date('2026-06-11T10:00:00.000Z'),
          dueDate: futureInRange,
        },
        {
          status: TaskStatus.TODO,
          startDate: new Date('2026-06-10T10:00:00.000Z'),
          endDate: expiredInRange,
        },
        {
          status: TaskStatus.TODO,
          startDate: new Date('2026-05-10T10:00:00.000Z'),
          endDate: expiredOutsideRange,
        },
      ],
      fixedTasks: [
        {
          status: FixedTaskStatus.DONE,
          startDate: new Date('2026-06-01T10:00:00.000Z'),
          endDate: new Date('2026-06-02T10:00:00.000Z'),
        },
        {
          status: FixedTaskStatus.IN_PROGRESS,
          startDate: new Date('2026-06-10T10:00:00.000Z'),
          endDate: futureInRange,
        },
        {
          status: FixedTaskStatus.TODO,
          startDate: new Date('2026-06-10T10:00:00.000Z'),
          endDate: expiredInRange,
        },
        {
          status: FixedTaskStatus.TODO,
          startDate: new Date('2026-05-10T10:00:00.000Z'),
          endDate: expiredOutsideRange,
        },
      ],
    });

    const result = await service.getStatusCounts(
      '6a39043bfc4f15b8c14eb3de',
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
      service.getStatusCounts(
        '6a39043bfc4f15b8c14eb3de',
        '2026-06-30',
        '2026-06-01',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findByDateRange).not.toHaveBeenCalled();
  });

  it('counts per-user overdue items only when their deadline is inside the range', async () => {
    const user = {
      userId: '6a39043bfc4f15b8c14eb3df',
      firstName: 'Ali',
      lastName: 'Test',
      email: 'ali@test.com',
    };
    repository.findByDateRangeForUsers.mockResolvedValue({
      tasks: [
        {
          status: TaskStatus.TODO,
          startDate: new Date('2026-06-07T10:00:00.000Z'),
          endDate: new Date('2026-06-07T10:00:00.000Z'),
          user,
        },
        {
          status: TaskStatus.TODO,
          startDate: new Date('2026-06-01T10:00:00.000Z'),
          endDate: new Date('2026-06-08T10:00:00.000Z'),
          user,
        },
      ],
      fixedTasks: [
        {
          status: FixedTaskStatus.TODO,
          isActive: false,
          startDate: new Date('2026-06-07T10:00:00.000Z'),
          endDate: new Date('2026-06-08T10:00:00.000Z'),
          user,
        },
        {
          status: FixedTaskStatus.TODO,
          isActive: false,
          startDate: new Date('2026-06-01T10:00:00.000Z'),
          endDate: new Date('2026-06-08T10:00:00.000Z'),
          user,
        },
      ],
    });

    const result = await service.getUserStatusCounts(
      '6a39043bfc4f15b8c14eb3de',
      '2026-06-07',
      '2026-06-08',
    );

    expect(result.users[0].tasks).toEqual({
      total: 1,
      done: 0,
      inProgress: 0,
      todo: 0,
      overdueUnfinished: 1,
    });
    expect(result.users[0].fixedTasks).toEqual({
      total: 1,
      done: 0,
      inProgress: 0,
      todo: 0,
      overdueUnfinished: 1,
    });
  });

  it('uses raw endDate as deadline when endTime is empty', async () => {
    const user = {
      userId: '6a39043bfc4f15b8c14eb3df',
      firstName: 'Ali',
      lastName: 'Test',
      email: 'ali@test.com',
    };
    repository.findByDateRangeForUsers.mockResolvedValue({
      tasks: [],
      fixedTasks: [
        {
          status: FixedTaskStatus.TODO,
          isActive: false,
          startDate: new Date('2026-06-27T21:41:00.015Z'),
          endDate: new Date('2026-06-28T20:30:00.000Z'),
          endTime: null,
          user,
        },
      ],
    });

    const result = await service.getUserStatusCounts(
      '6a39043bfc4f15b8c14eb3de',
      '2026-06-27T20:30:00.000Z',
      '2026-06-29T20:29:59.999Z',
    );

    expect(result.users[0].fixedTasks.overdueUnfinished).toBe(1);
  });

  it('counts done fixed tasks in range even when they are inactive', async () => {
    const user = {
      userId: '6a39043bfc4f15b8c14eb3df',
      firstName: 'Ali',
      lastName: 'Test',
      email: 'ali@test.com',
    };
    repository.findByDateRangeForUsers.mockResolvedValue({
      tasks: [],
      fixedTasks: [
        {
          status: FixedTaskStatus.DONE,
          isActive: false,
          startDate: new Date('2026-06-22T10:00:00.000Z'),
          endDate: new Date('2026-06-28T10:00:00.000Z'),
          user,
        },
      ],
    });

    const result = await service.getUserStatusCounts(
      '6a39043bfc4f15b8c14eb3de',
      '2026-06-21T20:30:00.000Z',
      '2026-06-29T20:29:59.999Z',
    );

    expect(result.users[0].fixedTasks).toEqual({
      total: 1,
      done: 1,
      inProgress: 0,
      todo: 0,
      overdueUnfinished: 0,
    });
  });

  it('counts fixed tasks as overdue only when unfinished and inactive', async () => {
    const user = {
      userId: '6a39043bfc4f15b8c14eb3df',
      firstName: 'Ali',
      lastName: 'Test',
      email: 'ali@test.com',
    };
    repository.findByDateRangeForUsers.mockResolvedValue({
      tasks: [],
      fixedTasks: [
        {
          status: FixedTaskStatus.TODO,
          isActive: true,
          startDate: new Date('2026-06-22T10:00:00.000Z'),
          endDate: new Date('2026-06-28T10:00:00.000Z'),
          user,
        },
        {
          status: FixedTaskStatus.IN_PROGRESS,
          isActive: false,
          startDate: new Date('2026-06-22T10:00:00.000Z'),
          endDate: new Date('2026-06-28T10:00:00.000Z'),
          user,
        },
      ],
    });

    const result = await service.getUserStatusCounts(
      '6a39043bfc4f15b8c14eb3de',
      '2026-06-21T20:30:00.000Z',
      '2026-06-29T20:29:59.999Z',
    );

    expect(result.users[0].fixedTasks).toEqual({
      total: 2,
      done: 0,
      inProgress: 0,
      todo: 1,
      overdueUnfinished: 1,
    });
  });

  it('counts in-progress items by status even when they are outside the date range', async () => {
    const user = {
      userId: '6a39043bfc4f15b8c14eb3df',
      firstName: 'Ali',
      lastName: 'Test',
      email: 'ali@test.com',
    };
    repository.findByDateRangeForUsers.mockResolvedValue({
      tasks: [
        {
          status: TaskStatus.IN_PROGRESS,
          startDate: new Date('2026-05-01T10:00:00.000Z'),
          endDate: new Date('2026-05-02T10:00:00.000Z'),
          user,
        },
      ],
      fixedTasks: [
        {
          status: FixedTaskStatus.IN_PROGRESS,
          isActive: true,
          startDate: new Date('2026-05-01T10:00:00.000Z'),
          endDate: new Date('2026-05-02T10:00:00.000Z'),
          user,
        },
      ],
    });

    const result = await service.getUserStatusCounts(
      '6a39043bfc4f15b8c14eb3de',
      '2026-06-21T20:30:00.000Z',
      '2026-06-29T20:29:59.999Z',
    );

    expect(result.users[0].tasks.inProgress).toBe(1);
    expect(result.users[0].fixedTasks.inProgress).toBe(1);
  });

  it('counts active fixed todo items even when they are outside the date range', async () => {
    const user = {
      userId: '6a39043bfc4f15b8c14eb3df',
      firstName: 'Ali',
      lastName: 'Test',
      email: 'ali@test.com',
    };
    repository.findByDateRangeForUsers.mockResolvedValue({
      tasks: [],
      fixedTasks: [
        {
          status: FixedTaskStatus.TODO,
          isActive: true,
          startDate: new Date('2026-05-01T10:00:00.000Z'),
          endDate: new Date('2026-05-02T10:00:00.000Z'),
          user,
        },
      ],
    });

    const result = await service.getUserStatusCounts(
      '6a39043bfc4f15b8c14eb3de',
      '2026-06-21T20:30:00.000Z',
      '2026-06-29T20:29:59.999Z',
    );

    expect(result.users[0].fixedTasks).toEqual({
      total: 1,
      done: 0,
      inProgress: 0,
      todo: 1,
      overdueUnfinished: 0,
    });
  });
});
