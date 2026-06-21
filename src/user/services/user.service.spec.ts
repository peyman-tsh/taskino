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
    findUserWorkSummary: jest.fn(),
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
});
