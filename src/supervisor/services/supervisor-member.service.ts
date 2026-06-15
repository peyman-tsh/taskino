import { Injectable } from '@nestjs/common';
import { SupervisorPaginationQueryDto } from '../dto/supervisor-query.dto';
import { SupervisorPolicyService } from './supervisor-policy.service';
import { SupervisorMemberRepository } from '../repositories/supervisor-member.repository';
import { SupervisorMemberWorkCounts } from './supervisor-member.types';
import { SupervisorMemberWorkRepository } from '../repositories/supervisor-member-work.repository';

@Injectable()
export class SupervisorMemberService {
  constructor(
    private readonly repository: SupervisorMemberRepository,
    private readonly workRepository: SupervisorMemberWorkRepository,
    private readonly policy: SupervisorPolicyService,
  ) {}

  async findMembers(
    supervisorId: string,
    query: SupervisorPaginationQueryDto,
  ) {
    const objectId = this.policy.toObjectId(supervisorId);
    const memberIds = await this.workRepository.findMemberIds(
      objectId,
      query.recurrence,
    );
    const { members, total } = await this.repository.findMembersByIds(
      memberIds,
      query.page,
      query.limit,
    );
    const paginatedMemberIds = members.map((member) => member._id);
    const [taskCounts, fixedTaskCounts] = await Promise.all([
      this.workRepository.countMemberTasks(
        objectId,
        paginatedMemberIds,
        query.recurrence,
      ),
      this.workRepository.countMemberFixedTasks(
        objectId,
        paginatedMemberIds,
        query.recurrence,
      ),
    ]);
    const taskCountsByUser = this.toCountMap(taskCounts);
    const fixedTaskCountsByUser = this.toCountMap(fixedTaskCounts);

    return {
      data: members.map((member) => {
        const tasks = taskCountsByUser.get(member._id.toString());
        const fixedTasks = fixedTaskCountsByUser.get(member._id.toString());

        return {
          userId: member._id.toString(),
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          mobile: member.mobile,
          role: member.roles,
          isActive: member.isActive,
          score: member.score ?? 0,
          progressPercentage: member.progressPercentage ?? 0,
          performanceStatus: member.performanceStatus,
          performanceEvaluatedAt: member.performanceEvaluatedAt,
          totalTasks: tasks?.total ?? 0,
          completedTasks: tasks?.completed ?? 0,
          totalFixedTasks: fixedTasks?.total ?? 0,
          completedFixedTasks: fixedTasks?.completed ?? 0,
        };
      }),
      total,
      page: query.page,
      limit: query.limit,
      recurrence: query.recurrence ?? null,
    };
  }

  private toCountMap(counts: SupervisorMemberWorkCounts[]) {
    return new Map(counts.map((count) => [count.userId.toString(), count]));
  }
}
