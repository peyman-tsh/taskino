import { Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';
import { UserProgressRepository } from '../repositories/user-progress.repository';
import { UserProgressCalculatorService } from './user-progress-calculator.service';
import { UserProgressService } from './user-progress.service';

describe('UserProgressService', () => {
  const repository = {
    findEvaluableUserById: jest.fn(),
    findAssignedWork: jest.fn(),
    saveEvaluation: jest.fn(),
  };
  const calculator = {
    calculate: jest.fn(),
  };
  const service = new UserProgressService(
    repository as unknown as UserProgressRepository,
    calculator as unknown as UserProgressCalculatorService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('recalculates and saves progress for one affected user', async () => {
    const userId = new Types.ObjectId();
    repository.findEvaluableUserById.mockResolvedValue({
      _id: userId,
      roles: UserRole.SPECIALIST,
    });
    repository.findAssignedWork.mockResolvedValue({
      tasks: [],
      fixedTasks: [],
    });
    calculator.calculate.mockReturnValue({
      totalTasks: 1,
      completedTasks: 1,
      totalFixedTasks: 1,
      completedFixedTasks: 1,
      taskProgressPercentage: 60,
      fixedTaskProgressPercentage: 90,
      progressPercentage: 75,
      performanceStatus: 'good',
    });

    await service.refreshUsers([userId.toString(), userId.toString()]);

    expect(repository.findAssignedWork).toHaveBeenCalledTimes(1);
    expect(repository.findAssignedWork).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
      expect.any(Date),
    );
    const [, periodStart, periodEnd] =
      repository.findAssignedWork.mock.calls[0];
    expect(periodEnd.getTime() - periodStart.getTime()).toBe(86_400_000);
    expect(repository.saveEvaluation).toHaveBeenCalledWith(
      userId,
      periodStart,
      expect.objectContaining({
        taskProgressPercentage: 60,
        fixedTaskProgressPercentage: 90,
        progressPercentage: 75,
        performanceStatus: 'good',
      }),
      expect.any(Date),
    );
  });

  it('recalculates progress for the supplied historical Tehran day', async () => {
    const userId = new Types.ObjectId();
    const taskStartDate = new Date('2026-07-15T13:45:00.000Z');
    repository.findEvaluableUserById.mockResolvedValue({
      _id: userId,
      roles: UserRole.SPECIALIST,
    });
    repository.findAssignedWork.mockResolvedValue({
      tasks: [],
      fixedTasks: [],
    });
    calculator.calculate.mockReturnValue({
      totalTasks: 0,
      completedTasks: 0,
      totalFixedTasks: 1,
      completedFixedTasks: 1,
      taskProgressPercentage: 0,
      fixedTaskProgressPercentage: 80,
      progressPercentage: 80,
      performanceStatus: 'good',
    });

    await service.refreshUsers([userId.toString()], taskStartDate);

    const [, periodStart] = repository.findAssignedWork.mock.calls[0];
    expect(periodStart).toEqual(new Date('2026-07-14T20:30:00.000Z'));
    expect(repository.saveEvaluation).toHaveBeenCalledWith(
      userId,
      new Date('2026-07-14T20:30:00.000Z'),
      expect.anything(),
      expect.any(Date),
    );
  });

  it('treats an ISO Tehran-midnight end value as the previous day\'s end boundary', async () => {
    const userId = new Types.ObjectId();
    repository.findDailyProgressByUser = jest.fn().mockResolvedValue([]);

    const result = await service.getDailyProgress(
      userId.toString(),
      '2026-08-04',
      '2026-08-04T20:30:00.000Z',
    );

    expect(repository.findDailyProgressByUser).toHaveBeenCalledWith(
      userId,
      new Date('2026-08-03T20:30:00.000Z'),
      new Date('2026-08-03T20:30:00.000Z'),
    );
    expect(result).toMatchObject({
      dayCount: 1,
      total: 1,
      data: [
        expect.objectContaining({
          date: new Date('2026-08-03T20:30:00.000Z'),
        }),
      ],
    });
  });
});
