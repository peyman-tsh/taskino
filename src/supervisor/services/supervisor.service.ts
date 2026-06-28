import { Injectable } from '@nestjs/common';
import {
  SupervisorFixedTasksQueryDto,
  SupervisorPaginationQueryDto,
  SupervisorRecurrenceQueryDto,
  SupervisorTasksQueryDto,
} from '../dto/supervisor-query.dto';
import { SupervisorStatisticsService } from './supervisor-statistics.service';
import { SupervisorMemberService } from './supervisor-member.service';
import { SupervisorWorkService } from './supervisor-work.service';
import { TaskService } from '../../task/services/task.service';
import { ExtraTaskApprovalStatus } from '../../task/task.schema';

@Injectable()
export class SupervisorService {
  constructor(
    private readonly statisticsService: SupervisorStatisticsService,
    private readonly memberService: SupervisorMemberService,
    private readonly workService: SupervisorWorkService,
    private readonly taskService: TaskService,
  ) {}

  getStatistics(supervisorId: string, query: SupervisorRecurrenceQueryDto) {
    return this.statisticsService.getStatistics(supervisorId, query.recurrence);
  }

  findSupervisedTasks(supervisorId: string, query: SupervisorTasksQueryDto) {
    return this.workService.findSupervisedTasks(supervisorId, query);
  }

  findSupervisedFixedTasks(
    supervisorId: string,
    query: SupervisorFixedTasksQueryDto,
  ) {
    return this.workService.findSupervisedFixedTasks(supervisorId, query);
  }

  findMembers(supervisorId: string, query: SupervisorPaginationQueryDto) {
    return this.memberService.findMembers(supervisorId, query);
  }

  findWorkFieldSpecialists(
    supervisorId: string,
    query: SupervisorPaginationQueryDto,
  ) {
    return this.memberService.findWorkFieldSpecialists(supervisorId, query);
  }

  reviewExtraTaskApproval(
    taskId: string,
    supervisorId: string,
    status: ExtraTaskApprovalStatus.APPROVED | ExtraTaskApprovalStatus.REJECTED,
  ) {
    return this.taskService.reviewExtraTaskApproval(
      taskId,
      supervisorId,
      status,
    );
  }
}
