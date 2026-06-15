import { Injectable } from '@nestjs/common';
import {
  SupervisorFixedTasksQueryDto,
  SupervisorTasksQueryDto,
} from '../dto/supervisor-query.dto';
import { SupervisorWorkRepository } from '../repositories/supervisor-work.repository';
import { SupervisorPolicyService } from './supervisor-policy.service';

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
  ) {
    return this.repository.findSupervisedFixedTasks(
      this.policy.toObjectId(supervisorId),
      query,
    );
  }
}
