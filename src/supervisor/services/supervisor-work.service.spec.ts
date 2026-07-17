import { Types } from 'mongoose';
import { SupervisorWorkRepository } from '../repositories/supervisor-work.repository';
import { SupervisorPolicyService } from './supervisor-policy.service';
import { SupervisorWorkService } from './supervisor-work.service';

describe('SupervisorWorkService', () => {
  const supervisorId = new Types.ObjectId().toString();
  const objectId = new Types.ObjectId(supervisorId);
  const repository = {
    findSupervisedTasks: jest.fn(),
    findSupervisedFixedTasks: jest.fn(),
    findLatestSupervisedFixedTasks: jest.fn(),
  };
  const policy = { toObjectId: jest.fn(() => objectId) };
  const service = new SupervisorWorkService(
    repository as unknown as SupervisorWorkRepository,
    policy as unknown as SupervisorPolicyService,
  );

  it('converts supervisor ID before querying supervised work', () => {
    const query = { page: 1, limit: 10 };
    const now = new Date('2026-06-22T11:05:00.000Z');

    service.findSupervisedTasks(supervisorId, query);
    service.findSupervisedFixedTasks(supervisorId, query, now);

    expect(policy.toObjectId).toHaveBeenCalledWith(supervisorId);
    expect(repository.findSupervisedTasks).toHaveBeenCalledWith(objectId, query);
    expect(repository.findSupervisedFixedTasks).toHaveBeenCalledWith(
      objectId,
      query,
      new Date('2026-06-21T20:30:00.000Z'),
      new Date('2026-06-22T20:30:00.000Z'),
    );
  });

  it('queries latest fixed-task series without a creator filter', () => {
    const query = { page: 1, limit: 10 };

    service.findLatestSupervisedFixedTasks(query);

    expect(repository.findLatestSupervisedFixedTasks).toHaveBeenCalledWith(query);
  });
});
