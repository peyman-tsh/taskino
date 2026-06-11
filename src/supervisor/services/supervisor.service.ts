import { Injectable } from '@nestjs/common';
import {
  SupervisorFixedTasksQueryDto,
  SupervisorPaginationQueryDto,
  SupervisorRecurrenceQueryDto,
  SupervisorTasksQueryDto,
} from '../dto/supervisor-query.dto';
import { SupervisorStatisticsService } from './supervisor-statistics.service';
import { SupervisorPolicyService } from './supervisor-policy.service';
import { SupervisorWorkRepository } from '../repositories/supervisor-work.repository';
import { SupervisorMemberService } from './supervisor-member.service';

@Injectable()
export class SupervisorService {
  constructor(
    private readonly statisticsService: SupervisorStatisticsService,
    private readonly policy: SupervisorPolicyService,
    private readonly repository: SupervisorWorkRepository,
    private readonly memberService: SupervisorMemberService,
  ) {}

  getStatistics(supervisorId: string, query: SupervisorRecurrenceQueryDto) {
    return this.statisticsService.getStatistics(supervisorId, query.recurrence);
  }

  findSupervisedTasks(supervisorId: string, query: SupervisorTasksQueryDto) {
    return this.repository.findSupervisedTasks(
      this.policy.toObjectId(supervisorId),
      query,
    );
  }

  findSupervisedFixedTasks(
    supervisorId: string,
    query: SupervisorFixedTasksQueryDto,
  ) {
    return this.repository.findSupervisedFixedTasks(
      this.policy.toObjectId(supervisorId),
      query,
    );
  }

  findMembers(supervisorId: string, query: SupervisorPaginationQueryDto) {
    return this.memberService.findMembers(supervisorId, query);
  }
}
