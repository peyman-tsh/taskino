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
  };
  const policy = { toObjectId: jest.fn(() => objectId) };
  const service = new SupervisorWorkService(
    repository as unknown as SupervisorWorkRepository,
    policy as unknown as SupervisorPolicyService,
  );

  it('converts supervisor ID before querying supervised work', () => {
    const query = { page: 1, limit: 10 };

    service.findSupervisedTasks(supervisorId, query);
    service.findSupervisedFixedTasks(supervisorId, query);

    expect(policy.toObjectId).toHaveBeenCalledWith(supervisorId);
    expect(repository.findSupervisedTasks).toHaveBeenCalledWith(objectId, query);
    expect(repository.findSupervisedFixedTasks).toHaveBeenCalledWith(
      objectId,
      query,
    );
  });
});
