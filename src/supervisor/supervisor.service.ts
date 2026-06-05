import { Injectable } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { TaskService } from '../task/task.service';
import { UserService } from '../user/user.service';
import { SupervisorPaginationQueryDto } from './dto/supervisor-pagination-query.dto';
import { UpdateSupervisedTaskStatusDto } from './dto/update-supervised-task-status.dto';

@Injectable()
export class SupervisorService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly userService: UserService,
  ) {}

  async getStatistics(supervisorId: string) {
    const [supervisedProjectIds, participatingProjectIds] = await Promise.all([
      this.projectService.findSupervisedProjectIds(supervisorId),
      this.projectService.findParticipatingProjectIds(supervisorId),
    ]);

    const [
      supervisedProjectsInProgressTasks,
      participatingProjectsDoneTasks,
      supervisorDoneTasks,
    ] = await Promise.all([
      this.taskService.countInProgressByProjectIds(supervisedProjectIds),
      this.taskService.countDoneByProjectIds(participatingProjectIds),
      this.taskService.countDoneByAssignee(supervisorId),
    ]);

    return {
      supervisedProjects: supervisedProjectIds.length,
      supervisedProjectsInProgressTasks,
      participatingProjectsDoneTasks,
      supervisorDoneTasks,
    };
  }

  async getProjects(supervisorId: string, query: SupervisorPaginationQueryDto) {
    const projects = await this.projectService.findSupervisedProjects(
      supervisorId,
      query.page,
      query.limit,
    );
    const taskCounts = await this.taskService.getStatusCountsByProjectIds(
      projects.data.map((project) => project.projectId),
    );
    const taskCountsByProjectId = new Map(
      taskCounts.map((counts) => [counts.projectId, counts]),
    );

    return {
      ...projects,
      data: projects.data.map((project) => {
        const counts = taskCountsByProjectId.get(project.projectId);

        return {
          ...project,
          totalTasks: counts?.totalTasks ?? 0,
          inProgressTasks: counts?.inProgressTasks ?? 0,
          doneTasks: counts?.doneTasks ?? 0,
        };
      }),
    };
  }

  async getProjectMembers(supervisorId: string, projectId: string) {
    const project = await this.projectService.getSupervisedProjectAccess(
      supervisorId,
      projectId,
    );
    const members = await this.userService.findProfilesByIds(project.memberIds);

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      members: members.map(({ score, ...member }) => member),
    };
  }

  async getProjectMembersPerformance(supervisorId: string, projectId: string) {
    const project = await this.projectService.getSupervisedProjectAccess(
      supervisorId,
      projectId,
    );
    const [members, taskCounts] = await Promise.all([
      this.userService.findProfilesByIds(project.memberIds),
      this.taskService.getMemberStatusCounts(project.projectId, project.memberIds),
    ]);
    const taskCountsByUserId = new Map(
      taskCounts.map((counts) => [counts.userId, counts]),
    );

    const performance = members
      .map((member) => {
        const counts = taskCountsByUserId.get(member.userId);
        const totalTasks = counts?.totalTasks ?? 0;
        const doneTasks = counts?.doneTasks ?? 0;

        return {
          ...member,
          totalTasks,
          todoTasks: counts?.todoTasks ?? 0,
          inProgressTasks: counts?.inProgressTasks ?? 0,
          doneTasks,
          completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        };
      })
      .sort((left, right) => right.completionRate - left.completionRate || right.doneTasks - left.doneTasks);

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      members: performance,
    };
  }

  async updateTaskStatus(
    supervisorId: string,
    projectId: string,
    taskId: string,
    status: UpdateSupervisedTaskStatusDto['status'],
  ) {
    await this.projectService.getSupervisedProjectAccess(supervisorId, projectId);

    return this.taskService.updateStatusInProject(taskId, projectId, status);
  }

  async getOverdueTasks(supervisorId: string, query: SupervisorPaginationQueryDto) {
    const projectIds = await this.projectService.findSupervisedProjectIds(supervisorId);

    return this.taskService.findOverdueByProjectIds(projectIds, query.page, query.limit);
  }

  async getProjectReport(supervisorId: string, projectId: string) {
    const project = await this.projectService.getSupervisedProjectAccess(
      supervisorId,
      projectId,
    );
    const report = await this.taskService.getProjectReport(projectId);

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      membersCount: project.memberIds.length,
      ...report,
    };
  }

  async getTeamPerformance(supervisorId: string) {
    const projects = await this.projectService.getSupervisedTeamContext(supervisorId);
    const projectIds = projects.map((project) => project.projectId);
    const memberIds = [...new Set(projects.flatMap((project) => project.memberIds))];
    const [members, taskCounts] = await Promise.all([
      this.userService.findProfilesByIds(memberIds),
      this.taskService.getMemberStatusCountsAcrossProjects(projectIds, memberIds),
    ]);
    const taskCountsByUserId = new Map(
      taskCounts.map((counts) => [counts.userId, counts]),
    );
    const projectNamesByMemberId = new Map<string, Set<string>>();

    projects.forEach((project) => {
      project.memberIds.forEach((memberId) => {
        const projectNames = projectNamesByMemberId.get(memberId) ?? new Set<string>();
        projectNames.add(project.projectName);
        projectNamesByMemberId.set(memberId, projectNames);
      });
    });

    const performance = members
      .map((member) => {
        const counts = taskCountsByUserId.get(member.userId);
        const totalTasks = counts?.totalTasks ?? 0;
        const doneTasks = counts?.doneTasks ?? 0;
        const projectNames = [...(projectNamesByMemberId.get(member.userId) ?? [])];

        return {
          ...member,
          projectsCount: projectNames.length,
          projects: projectNames,
          totalTasks,
          todoTasks: counts?.todoTasks ?? 0,
          inProgressTasks: counts?.inProgressTasks ?? 0,
          doneTasks,
          overdueTasks: counts?.overdueTasks ?? 0,
          completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        };
      })
      .sort((left, right) => right.completionRate - left.completionRate || right.doneTasks - left.doneTasks);

    const totalTasks = performance.reduce((total, member) => total + member.totalTasks, 0);
    const doneTasks = performance.reduce((total, member) => total + member.doneTasks, 0);

    return {
      projectsCount: projects.length,
      membersCount: performance.length,
      totalTasks,
      doneTasks,
      completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      members: performance,
    };
  }
}
