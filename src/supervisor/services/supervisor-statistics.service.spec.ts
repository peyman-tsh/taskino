import { Types } from 'mongoose';
import { SupervisorStatisticsRepository } from '../repositories/supervisor-statistics.repository';
import { SupervisorPolicyService } from './supervisor-policy.service';
import { SupervisorStatisticsService } from './supervisor-statistics.service';

describe('SupervisorStatisticsService', () => {
  const repository = {
    countSupervisedTasks: jest.fn(),
    countSupervisedFixedTasks: jest.fn(),
    countSupervisedInProgressTasks: jest.fn(),
    countSupervisedInProgressFixedTasks: jest.fn(),
    countMyInProgressTasks: jest.fn(),
    countMyInProgressFixedTasks: jest.fn(),
    countMySuccessfulTasks: jest.fn(),
    countMyOnTimeSuccessfulTasks: jest.fn(),
  };
  const policy = { toObjectId: jest.fn(() => new Types.ObjectId()) };
  const service = new SupervisorStatisticsService(
    repository as unknown as SupervisorStatisticsRepository,
    policy as unknown as SupervisorPolicyService,
  );

  it('combines supervisor statistics from the statistics repository', async () => {
    Object.values(repository).forEach((mock) => mock.mockResolvedValue(1));

    await expect(service.getStatistics(new Types.ObjectId().toString())).resolves
      .toEqual({
        recurrence: null,
        supervisedTasks: 1,
        supervisedFixedTasks: 1,
        supervisedInProgressTasks: 1,
        supervisedInProgressFixedTasks: 1,
        myInProgressTasks: 1,
        myInProgressFixedTasks: 1,
        mySuccessfulTasks: 1,
        myOnTimeSuccessfulTasks: 1,
      });
  });
});
