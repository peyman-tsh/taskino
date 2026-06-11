import { Injectable } from '@nestjs/common';
import { TaskRecurrence } from '../../task/task.schema';
import { SupervisorPolicyService } from './supervisor-policy.service';
import { SupervisorWorkRepository } from './supervisor-work.repository';

@Injectable()
export class SupervisorStatisticsService {
  constructor(
    private readonly repository: SupervisorWorkRepository,
    private readonly policy: SupervisorPolicyService,
  ) {}

  async getStatistics(supervisorId: string, recurrence?: TaskRecurrence) {
    const objectId = this.policy.toObjectId(supervisorId);
    const [
      supervisedTasks,
      supervisedFixedTasks,
      supervisedInProgressTasks,
      supervisedInProgressFixedTasks,
      myInProgressTasks,
      myInProgressFixedTasks,
      mySuccessfulTasks,
      myOnTimeSuccessfulTasks,
    ] = await Promise.all([
      this.repository.countSupervisedTasks(objectId, recurrence),
      this.repository.countSupervisedFixedTasks(objectId, recurrence),
      this.repository.countSupervisedInProgressTasks(objectId, recurrence),
      this.repository.countSupervisedInProgressFixedTasks(objectId, recurrence),
      this.repository.countMyInProgressTasks(objectId, recurrence),
      this.repository.countMyInProgressFixedTasks(objectId, recurrence),
      this.repository.countMySuccessfulTasks(objectId, recurrence),
      this.repository.countMyOnTimeSuccessfulTasks(objectId, recurrence),
    ]);

    return {
      recurrence: recurrence ?? null,
      supervisedTasks,
      supervisedFixedTasks,
      supervisedInProgressTasks,
      supervisedInProgressFixedTasks,
      myInProgressTasks,
      myInProgressFixedTasks,
      mySuccessfulTasks,
      myOnTimeSuccessfulTasks,
    };
  }

}
