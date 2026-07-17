import { Injectable } from '@nestjs/common';
import {
  SupervisorFixedTasksQueryDto,
  SupervisorTasksQueryDto,
} from '../dto/supervisor-query.dto';
import { SupervisorWorkRepository } from '../repositories/supervisor-work.repository';
import { SupervisorPolicyService } from './supervisor-policy.service';
import { getTehranDayRange } from '../../common/utils/daily-progress-range.util';

@Injectable()
export class SupervisorWorkService {
  constructor(
    private readonly repository: SupervisorWorkRepository,
    private readonly policy: SupervisorPolicyService,
  ) {}

  findSupervisedTasks(supervisorId: string, query: SupervisorTasksQueryDto) {
    return this.repository.findSupervisedTasks(
      this.policy.toObjectId(supervisorId),
      query,
    );
  }

  findSupervisedFixedTasks(
    supervisorId: string,
    query: SupervisorFixedTasksQueryDto,
    now = new Date(),
  ) {
    const { periodStart, periodEnd } = getTehranDayRange(now);

    return this.repository.findSupervisedFixedTasks(
      this.policy.toObjectId(supervisorId),
      query,
      periodStart,
      periodEnd,
    );
  }

  findLatestSupervisedFixedTasks(query: SupervisorFixedTasksQueryDto) {
    return this.repository.findLatestSupervisedFixedTasks(query);
  }
}
