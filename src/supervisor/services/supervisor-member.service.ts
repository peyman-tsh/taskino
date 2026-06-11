import { Injectable } from '@nestjs/common';
import { SupervisorPaginationQueryDto } from '../dto/supervisor-query.dto';
import { SupervisorPolicyService } from './supervisor-policy.service';
import { SupervisorMemberRepository } from '../repositories/supervisor-member.repository';
import { SupervisorMemberWorkCounts } from './supervisor-member.types';

@Injectable()
export class SupervisorMemberService {
  constructor(
    private readonly repository: SupervisorMemberRepository,
    private readonly policy: SupervisorPolicyService,
  ) {}

  async findMembers(
    supervisorId: string,
    query: SupervisorPaginationQueryDto,
  ) {
    const objectId = this.policy.toObjectId(supervisorId);
    const { members, total } = await this.repository.findMembers(
      objectId,
      query.recurrence,
      query.page,
      query.limit,
    );
    const memberIds = members.map((member) => member._id);
    const [taskCounts, fixedTaskCounts] = await Promise.all([
      this.repository.countMemberTasks(objectId, memberIds, query.recurrence),
      this.repository.countMemberFixedTasks(
        objectId,
        memberIds,
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
