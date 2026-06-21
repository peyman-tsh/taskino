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
      taskProgressPercentage: 60,
      fixedTaskProgressPercentage: 90,
      progressPercentage: 75,
      performanceStatus: 'good',
    });

    await service.refreshUsers([userId.toString(), userId.toString()]);

    expect(repository.findAssignedWork).toHaveBeenCalledTimes(1);
    expect(repository.saveEvaluation).toHaveBeenCalledWith(
      userId,
      60,
      90,
      75,
      'good',
      expect.any(Date),
    );
  });
});
