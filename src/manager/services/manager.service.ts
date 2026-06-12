import { Injectable } from '@nestjs/common';
import { TaskReportService } from '../../task/services/task-report.service';
import { UserService } from '../../user/services/user.service';
import { BaseManagerService } from './base-manager.service';
import { ManagerUsersQueryDto } from '../dto/manager-users-query.dto';
import { MonthlyPerformanceQueryDto } from '../dto/monthly-performance-query.dto';
import { UserProgressService } from './user-progress.service';
import { ManagerTasksQueryDto } from '../dto/manager-tasks-query.dto';
import { ManagerTasksService } from './manager-tasks.service';

@Injectable()
export class ManagerService extends BaseManagerService {
  constructor(
    private readonly userService: UserService,
    private readonly taskReportService: TaskReportService,
    private readonly userProgressService: UserProgressService,
    private readonly managerTasksService: ManagerTasksService,
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
}
