import { Injectable } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { TaskService } from '../task/task.service';
import { UserService } from '../user/user.service';
import { BaseManagerService } from './base-manager.service';
import { ManagerUsersQueryDto } from './dto/manager-users-query.dto';
import { MonthlyPerformanceQueryDto } from './dto/monthly-performance-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { TaskAnalyticsQueryDto } from './dto/task-analytics-query.dto';
import { Types } from 'mongoose';
import { UserRole } from '../user/schemas/user.schema';

type PopulatedProjectAssignee = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  roles: UserRole;
  isActive: boolean;
  workField: string;
};

@Injectable()
export class ManagerService extends BaseManagerService {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
  ) {
    super();
  }

  async getDashboardStatistics(): Promise<{
    activeProjects: number;
    openTasks: number;
    activeUsers: number;
  }> {
    const [activeProjects, openTasks, activeUsers] = await Promise.all([
      this.projectService.countActiveProjects(),
      this.taskService.countOpenTasks(),
      this.userService.countActiveUsers(),
    ]);

    return { activeProjects, openTasks, activeUsers };
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

  setProjectActivation(projectId: string, isActive: boolean) {
    this.toObjectId(projectId, 'project ID');

    return this.projectService.setActivation(projectId, isActive);
  }

  async getProjectAssignee(projectId: string) {
    this.toObjectId(projectId, 'project ID');

    const project = await this.projectService.findById(projectId);
    const assignee = project.assigneeId as unknown as
      | PopulatedProjectAssignee
      | undefined;

    return {
      projectId: project._id.toString(),
      projectName: project.title,
      assignee: assignee
        ? {
            user: {
              userId: assignee._id.toString(),
              firstName: assignee.firstName,
              lastName: assignee.lastName,
              email: assignee.email,
              workField: assignee.workField,
            },
            role: assignee.roles,
            isActive: assignee.isActive,
          }
        : null,
    };
  }

  getProjectProgress(projectId: string) {
    this.toObjectId(projectId, 'project ID');

    return this.projectService.getProgress(projectId);
  }

  getProjectsProgress(query: PaginationQueryDto) {
    const { page, limit } = this.getPagination(query);

    return this.projectService.getProgressList(page, limit);
  }

  getTaskStatusOverview(query: TaskAnalyticsQueryDto) {
    if (query.projectId) {
      this.toObjectId(query.projectId, 'project ID');
    }

    return this.taskService.getTaskStatusOverview(query.projectId);
  }

  getTaskCountsByUsers(query: TaskAnalyticsQueryDto) {
    if (query.projectId) {
      this.toObjectId(query.projectId, 'project ID');
    }

    return this.taskService.getTaskCountsByAssignee(query.projectId);
  }

  getMonthlyUserPerformance(query: MonthlyPerformanceQueryDto) {
    if (query.projectId) {
      this.toObjectId(query.projectId, 'project ID');
    }

    return this.taskService.getMonthlyUserPerformance({
      month: query.month,
      year: query.year,
      projectId: query.projectId,
    });
  }
}
