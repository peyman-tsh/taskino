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

@Injectable()
export class SupervisorService {
  constructor(
    private readonly statisticsService: SupervisorStatisticsService,
    private readonly memberService: SupervisorMemberService,
    private readonly workService: SupervisorWorkService,
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
}
