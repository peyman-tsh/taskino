import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import { UserProgressEvents } from '../../common/events/user-progress.events';

describe('UserService user progress', () => {
  const repository = {
    findSpecialistProgressById: jest.fn(),
    findRawById: jest.fn(),
    findUserWorkSummary: jest.fn(),
    findWorkForDailyProgressRange: jest.fn(),
    findCompletionCountsByWorkField: jest.fn(),
    updatePerformanceStatus: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const eventBus = {
    publishAndWait: jest.fn(),
  };
  const service = new UserService(
    configService as unknown as ConfigService,
    repository as unknown as UserRepository,
    eventBus as unknown as InternalEventBus,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns progress for the authenticated specialist', async () => {
    const userId = new Types.ObjectId().toString();
    repository.findSpecialistProgressById.mockResolvedValue({
      userId,
      taskProgressPercentage: 60,
      fixedTaskProgressPercentage: 90,
      progressPercentage: 75,
      performanceStatus: 'weak',
      score: 30,
    });

    await expect(service.getSpecialistProgress(userId)).resolves.toEqual({
      userId,
      taskProgressPercentage: 60,
      fixedTaskProgressPercentage: 90,
      progressPercentage: 75,
      progressDate: undefined,
      performanceStatus: 'good',
      score: 30,
    });
    expect(eventBus.publishAndWait).toHaveBeenCalledWith(
      UserProgressEvents.REFRESH_REQUESTED,
      expect.objectContaining({ userIds: [userId] }),
    );
    expect(repository.updatePerformanceStatus).toHaveBeenCalledWith(
      userId,
      'good',
    );
  });

  it('returns progress for the authenticated supervisor', async () => {
    const userId = new Types.ObjectId().toString();
    repository.findSpecialistProgressById.mockResolvedValue({
      userId,
      taskProgressPercentage: 60,
      fixedTaskProgressPercentage: 90,
      progressPercentage: 75,
      performanceStatus: 'good',
      score: 20,
    });

    await expect(service.getSpecialistProgress(userId)).resolves.toEqual({
      userId,
      taskProgressPercentage: 60,
      fixedTaskProgressPercentage: 90,
      progressPercentage: 75,
      progressDate: undefined,
      performanceStatus: 'good',
      score: 20,
    });
  });

  it('rejects a user that is not a specialist or supervisor', async () => {
    const userId = new Types.ObjectId().toString();
    repository.findSpecialistProgressById.mockResolvedValue(null);

    await expect(service.getSpecialistProgress(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns work summary for the authenticated specialist', async () => {
    const userId = new Types.ObjectId().toString();
    repository.findUserWorkSummary.mockResolvedValue({
      userId,
      totalTasks: 3,
      completedTasks: 2,
      totalFixedTasks: 5,
      completedFixedTasks: 4,
      score: 20,
    });

    await expect(service.getMyWorkSummary(userId)).resolves.toEqual({
      userId,
      totalTasks: 3,
      completedTasks: 2,
      totalFixedTasks: 5,
      completedFixedTasks: 4,
      score: 20,
    });
  });

  it('calculates the range summary from task and fixed-task documents', async () => {
    const userId = new Types.ObjectId().toString();
    const date = new Date('2026-07-17T20:30:00.000Z');
    repository.findSpecialistProgressById.mockResolvedValue({ userId });
    repository.findWorkForDailyProgressRange
      .mockResolvedValueOnce({
        tasks: [
          { startDate: date, status: 'done', ratingScore: 4 },
          { startDate: date, status: 'todo', ratingScore: null },
        ],
        fixedTasks: [
          { startDate: date, status: 'done', ratingScore: 5 },
          { startDate: date, status: 'done', ratingScore: 4 },
        ],
      })
      .mockResolvedValueOnce({
        tasks: [
          { startDate: date, status: 'done', ratingScore: 4 },
          { startDate: date, status: 'todo', ratingScore: null },
        ],
        fixedTasks: [],
      });

    const result = await service.getMyDailyProgress(
      userId,
      '2026-07-18',
      '2026-07-18',
    );

    expect(result.doneTaskPercentage).toBe(80);
    expect(result).toMatchObject({
      totalTasks: 2,
      completedTasks: 1,
      totalFixedTasks: 2,
      completedFixedTasks: 2,
      taskProgressPercentage: 50,
      fixedTaskProgressPercentage: 100,
      doneFixedTaskProgressPercentage: 90,
      progressPercentage: 75,
      averageProgressPercentage: 75,
      startScore: 2.5,
      performanceStatus: 'good',
    });
    expect(repository.findWorkForDailyProgressRange).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
      new Date('2026-07-17T20:30:00.000Z'),
      new Date('2026-07-18T20:30:00.000Z'),
    );
    expect(repository.findWorkForDailyProgressRange).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
      new Date(0),
      expect.any(Date),
    );
  });

  it('calculates range progress from the range task and fixed-task averages', async () => {
    const userId = new Types.ObjectId().toString();
    const firstDay = new Date('2026-07-17T20:30:00.000Z');
    const secondDay = new Date('2026-07-18T20:30:00.000Z');
    repository.findSpecialistProgressById.mockResolvedValue({ userId });
    repository.findWorkForDailyProgressRange
      .mockResolvedValueOnce({
        tasks: [{ startDate: firstDay, status: 'done', ratingScore: 5 }],
        fixedTasks: [
          { startDate: firstDay, status: 'done', ratingScore: 5 },
          { startDate: secondDay, status: 'done', ratingScore: 5 },
        ],
      })
      .mockResolvedValueOnce({
        tasks: [
          { startDate: firstDay, status: 'done', ratingScore: 5 },
          { startDate: secondDay, status: 'todo', ratingScore: null },
        ],
        fixedTasks: [],
      });

    const result = await service.getMyDailyProgress(
      userId,
      '2026-07-18',
      '2026-07-19',
    );

    expect(result).toMatchObject({
      taskProgressPercentage: 50,
      fixedTaskProgressPercentage: 100,
      progressPercentage: 75,
      averageProgressPercentage: 75,
      startScore: 2.5,
    });
  });

  it('ranks users by all-time completed regular and fixed tasks', async () => {
    const managerId = new Types.ObjectId().toString();
    repository.findRawById.mockResolvedValue({ workField: 'it' });
    repository.findCompletionCountsByWorkField.mockResolvedValue([
      {
        userId: 'first-user',
        firstName: 'Ali',
        lastName: 'Ahmadi',
        completedTasks: 3,
        completedFixedTasks: 2,
      },
      {
        userId: 'second-user',
        firstName: 'Sara',
        lastName: 'Karimi',
        completedTasks: 2,
        completedFixedTasks: 8,
      },
    ]);

    await expect(service.getCompletionRatings(managerId)).resolves.toEqual({
      total: 2,
      data: [
        {
          userId: 'second-user',
          firstName: 'Sara',
          lastName: 'Karimi',
          completedTasks: 2,
          completedFixedTasks: 8,
          totalCompleted: 10,
          rank: 1,
          completionRate: 100,
        },
        {
          userId: 'first-user',
          firstName: 'Ali',
          lastName: 'Ahmadi',
          completedTasks: 3,
          completedFixedTasks: 2,
          totalCompleted: 5,
          rank: 2,
          completionRate: 50,
        },
      ],
    });
  });
});
