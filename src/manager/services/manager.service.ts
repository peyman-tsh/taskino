import { Injectable } from '@nestjs/common';
import { TaskReportService } from '../../task/services/task-report.service';
import { UserService } from '../../user/services/user.service';
import { BaseManagerService } from './base-manager.service';
import { ManagerUsersQueryDto } from '../dto/manager-users-query.dto';
import { MonthlyPerformanceQueryDto } from '../dto/monthly-performance-query.dto';
import { UserProgressService } from './user-progress.service';
import { ManagerTasksQueryDto } from '../dto/manager-tasks-query.dto';
import { ManagerTasksService } from './manager-tasks.service';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { ManagerLeaveRequestService } from './manager-leave-request.service';

@Injectable()
export class ManagerService extends BaseManagerService {
  constructor(
    private readonly userService: UserService,
    private readonly taskReportService: TaskReportService,
    private readonly userProgressService: UserProgressService,
    private readonly managerTasksService: ManagerTasksService,
    private readonly managerLeaveRequestService: ManagerLeaveRequestService,
  ) {
    super();
  }

  async getDashboardStatistics(): Promise<{
    openTasks: number;
    activeUsers: number;
  }> {
    const [openTasks, activeUsers] = await Promise.all([
      this.taskReportService.countOpenTasks(),
      this.userService.countActiveUsers(),
    ]);

    return { openTasks, activeUsers };
  }

  findUsers(query: ManagerUsersQueryDto) {
    const { page, limit } = this.getPagination(query);

    return this.userService.findForManager(page, limit, {
      isActive: query.isActive,
      role: query.role,
      name: query.name,
    });
  }

  findUserByName(firstName: string, lastName: string) {
    return this.userService.findByName(firstName, lastName);
  }

  updateUserRole(userId: string, role: string) {
    this.toObjectId(userId, 'user ID');

    return this.userService.updateRole(userId, role);
  }

  getTaskStatusOverview() {
    return this.taskReportService.getTaskStatusOverview();
  }

  getTaskCountsByUsers() {
    return this.taskReportService.getTaskCountsByAssignee();
  }

  getMonthlyUserPerformance(query: MonthlyPerformanceQueryDto) {
    return this.taskReportService.getMonthlyUserPerformance({
      month: query.month,
      year: query.year,
    });
  }

  async evaluateUserProgress() {
    return this.userProgressService.evaluate();
  }

  findAllTasks(query: ManagerTasksQueryDto) {
    return this.managerTasksService.findAll(query);
  }

  findAllLeaveRequests(query: PaginationQueryDto) {
    return this.managerLeaveRequestService.findAll(query);
  }

  approveLeaveRequest(id: string, managerId: string) {
    return this.managerLeaveRequestService.approve(id, managerId);
  }
}
