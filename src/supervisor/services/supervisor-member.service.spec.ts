import { Types } from 'mongoose';
import { SupervisorMemberRepository } from '../repositories/supervisor-member.repository';
import { SupervisorMemberWorkRepository } from '../repositories/supervisor-member-work.repository';
import { SupervisorMemberService } from './supervisor-member.service';
import { SupervisorPolicyService } from './supervisor-policy.service';

describe('SupervisorMemberService', () => {
  const supervisorId = new Types.ObjectId().toString();
  const memberId = new Types.ObjectId();
  const repository = {
    findMembersByIds: jest.fn(),
  };
  const workRepository = {
    findMemberIds: jest.fn(),
    countMemberTasks: jest.fn(),
    countMemberFixedTasks: jest.fn(),
  };
  const policy = { toObjectId: jest.fn(() => new Types.ObjectId(supervisorId)) };
  const service = new SupervisorMemberService(
    repository as unknown as SupervisorMemberRepository,
    workRepository as unknown as SupervisorMemberWorkRepository,
    policy as unknown as SupervisorPolicyService,
  );

  it('combines member profiles with regular and fixed task counts', async () => {
    workRepository.findMemberIds.mockResolvedValue([memberId]);
    repository.findMembersByIds.mockResolvedValue({
      members: [
        {
          _id: memberId,
          firstName: 'Ali',
          lastName: 'Ahmadi',
          email: 'ali@example.com',
          roles: 'specialist',
          isActive: true,
          progressPercentage: 0,
          performanceStatus: 'weak',
        },
      ],
      total: 1,
    });
    workRepository.countMemberTasks.mockResolvedValue([
      { userId: memberId, total: 3, completed: 2 },
    ]);
    workRepository.countMemberFixedTasks.mockResolvedValue([
      { userId: memberId, total: 4, completed: 1 },
    ]);

    const result = await service.findMembers(supervisorId, {
      page: 1,
      limit: 10,
    });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        userId: memberId.toString(),
        totalTasks: 3,
        completedTasks: 2,
        totalFixedTasks: 4,
        completedFixedTasks: 1,
      }),
    );
  });
});
