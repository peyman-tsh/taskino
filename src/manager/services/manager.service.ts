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
import { ManagerWorkStatusService } from './manager-work-status.service';
import { FixedTaskService } from '../../fixedTask/services/fixed-task.service';
import { FixedTaskTimingApprovalStatus } from '../../fixedTask/fixed-task.schema';
import { TaskService } from '../../task/services/task.service';

@Injectable()
export class ManagerService extends BaseManagerService {
  constructor(
    private readonly userService: UserService,
    private readonly taskReportService: TaskReportService,
    private readonly userProgressService: UserProgressService,
    private readonly managerTasksService: ManagerTasksService,
    private readonly managerLeaveRequestService: ManagerLeaveRequestService,
    private readonly managerWorkStatusService: ManagerWorkStatusService,
    private readonly fixedTaskService: FixedTaskService,
    private readonly taskService: TaskService,
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

  getWorkStatusCounts(managerId: string, from: string, to: string) {
    this.toObjectId(managerId, 'manager ID');
    return this.managerWorkStatusService.getStatusCounts(managerId, from, to);
  }

  getUserWorkStatusCounts(
    managerId: string,
    from: string,
    to: string,
    userId?: string,
  ) {
    this.toObjectId(managerId, 'manager ID');
    if (userId) this.toObjectId(userId, 'user ID');
    return this.managerWorkStatusService.getUserStatusCounts(
      managerId,
      from,
      to,
      userId,
    );
  }

  getOverdueFixedTasks(
    managerId: string,
    from: string,
    to: string,
    userId?: string,
  ) {
    this.toObjectId(managerId, 'manager ID');
    if (userId) this.toObjectId(userId, 'user ID');
    return this.managerWorkStatusService.getOverdueFixedTasks(
      managerId,
      from,
      to,
      userId,
    );
  }

  getDoneFixedTasks(
    managerId: string,
    from: string,
    to: string,
    userId?: string,
  ) {
    this.toObjectId(managerId, 'manager ID');
    if (userId) this.toObjectId(userId, 'user ID');
    return this.managerWorkStatusService.getDoneFixedTasks(
      managerId,
      from,
      to,
      userId,
    );
  }

  getInProgressFixedTasks(userId?: string) {
    if (userId) this.toObjectId(userId, 'user ID');
    return this.managerWorkStatusService.getInProgressFixedTasks(userId);
  }

  getTodoFixedTasks(userId?: string) {
    if (userId) this.toObjectId(userId, 'user ID');
    return this.managerWorkStatusService.getTodoFixedTasks(userId);
  }

  reviewFixedTaskTiming(
    fixedTaskId: string,
    managerId: string,
    status:
      | FixedTaskTimingApprovalStatus.APPROVED
      | FixedTaskTimingApprovalStatus.REJECTED,
    approvedDurationMinutes?: number,
    taskComment?: string,
  ) {
    return this.fixedTaskService.reviewTiming(
      fixedTaskId,
      managerId,
      status,
      approvedDurationMinutes,
      taskComment,
    );
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

  findAllExtraTasks(query: PaginationQueryDto) {
    const { page, limit } = this.getPagination(query);
    return this.taskService.findAllExtraTasks(page, limit);
  }

  getDailyFixedTaskDurationBalance(
    from: string,
    to: string,
    userId?: string,
  ) {
    return this.managerTasksService.getDailyFixedTaskDurationBalance(
      from,
      to,
      userId,
    );
  }

  findAllLeaveRequests(query: PaginationQueryDto) {
    return this.managerLeaveRequestService.findAll(query);
  }

  approveLeaveRequest(id: string, managerId: string) {
    return this.managerLeaveRequestService.approve(id, managerId);
  }
}
