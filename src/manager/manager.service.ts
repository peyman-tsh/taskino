import { Injectable } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { ProjectMemberService } from '../projectMember/projectMember.service';
import { TaskService } from '../task/task.service';
import { UserService } from '../user/user.service';
import { BaseManagerService } from './base-manager.service';
import { ManagerUsersQueryDto } from './dto/manager-users-query.dto';

@Injectable()
export class ManagerService extends BaseManagerService {
  constructor(
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly projectMemberService: ProjectMemberService,
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

  async getProjectMembers(projectId: string) {
    this.toObjectId(projectId, 'project ID');

    const [project, projectMembers] = await Promise.all([
      this.projectService.findById(projectId),
      this.projectMemberService.findAllByProject(projectId),
    ]);

    return {
      projectId: project._id.toString(),
      projectName: project.title,
      members: projectMembers.map((projectMember) => ({
        user: projectMember.user,
        role: projectMember.role,
        isActive: projectMember.isActive,
      })),
    };
  }

  getProjectProgress(projectId: string) {
    this.toObjectId(projectId, 'project ID');

    return this.projectService.getProgress(projectId);
  }
}
