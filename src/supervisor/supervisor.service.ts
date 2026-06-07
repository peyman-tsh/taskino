import { Injectable } from '@nestjs/common';
import { ProjectService } from '../project/project.service';
import { TaskService } from '../task/task.service';
import { UserService } from '../user/user.service';
import { SupervisorPaginationQueryDto } from './dto/supervisor-pagination-query.dto';
import { UpdateSupervisedTaskStatusDto } from './dto/update-supervised-task-status.dto';
import { FixedTaskService } from '../fixedTask/fixed-task.service';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';

@Injectable()
export class SupervisorService {
  constructor(
    private readonly projectService: ProjectService,
    private readonly taskService: TaskService,
    private readonly userService: UserService,
    private readonly fixedTaskService: FixedTaskService,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  private isTransactionUnsupported(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.message.includes('Transaction numbers are only allowed') ||
        error.message.includes('replica set member or mongos'))
    );
  }

  private async performProjectReassignment(
    supervisorId: string,
    projectId: string,
    assigneeId: string,
    session?: ClientSession,
  ) {
    const assignment = await this.projectService.assignSpecialistBySupervisor(
      supervisorId,
      projectId,
      assigneeId,
      session,
    );
    const reassignedTasks = await this.taskService.reassignProjectTasks(
      projectId,
      assigneeId,
      session,
    );
    const reassignedFixedTasks =
      await this.fixedTaskService.reassignProjectTemplates(
        projectId,
        assigneeId,
        session,
      );

    return { assignment, reassignedTasks, reassignedFixedTasks };
  }

  async assignProjectSpecialist(
    supervisorId: string,
    projectId: string,
    assigneeId: string,
  ) {
    const session = await this.connection.startSession();
    let reassignment;
    try {
      await session.withTransaction(async () => {
        reassignment = await this.performProjectReassignment(
          supervisorId,
          projectId,
          assigneeId,
          session,
        );
      });
    } catch (error) {
      if (!this.isTransactionUnsupported(error)) throw error;
      reassignment = await this.performProjectReassignment(
        supervisorId,
        projectId,
        assigneeId,
      );
    } finally {
      await session.endSession();
    }

    if (!reassignment) {
      throw new Error('Project reassignment did not complete');
    }

    return {
      project: await this.projectService.findById(projectId),
      previousAssigneeId: reassignment.assignment.previousAssigneeId,
      assigneeId,
      reassignedTasks: reassignment.reassignedTasks,
      reassignedFixedTasks: reassignment.reassignedFixedTasks,
    };
  }

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

  async getProjectAssignee(supervisorId: string, projectId: string) {
    const project = await this.projectService.getSupervisedProjectAccess(
      supervisorId,
      projectId,
    );
    const assignee = project.assigneeId
      ? (await this.userService.findProfilesByIds([project.assigneeId]))[0]
      : undefined;

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      assignee: assignee
        ? (({ score, ...profile }) => profile)(assignee)
        : null,
    };
  }

  async getProjectAssigneePerformance(supervisorId: string, projectId: string) {
    const project = await this.projectService.getSupervisedProjectAccess(
      supervisorId,
      projectId,
    );
    const assigneeIds = project.assigneeId ? [project.assigneeId] : [];
    const [assignees, taskCounts] = await Promise.all([
      this.userService.findProfilesByIds(assigneeIds),
      this.taskService.getAssigneeStatusCounts(project.projectId, assigneeIds),
    ]);
    const taskCountsByUserId = new Map(
      taskCounts.map((counts) => [counts.userId, counts]),
    );

    const performance = assignees
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
          completionRate:
            totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        };
      })
      .sort(
        (left, right) =>
          right.completionRate - left.completionRate ||
          right.doneTasks - left.doneTasks,
      );

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      assignee: performance[0] ?? null,
    };
  }

  async updateTaskStatus(
    supervisorId: string,
    projectId: string,
    taskId: string,
    status: UpdateSupervisedTaskStatusDto['status'],
  ) {
    await this.projectService.getSupervisedProjectAccess(
      supervisorId,
      projectId,
    );

    return this.taskService.updateStatusInProject(taskId, projectId, status);
  }

  async getOverdueTasks(
    supervisorId: string,
    query: SupervisorPaginationQueryDto,
  ) {
    const projectIds =
      await this.projectService.findSupervisedProjectIds(supervisorId);

    return this.taskService.findOverdueByProjectIds(
      projectIds,
      query.page,
      query.limit,
    );
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
      assigneeCount: project.assigneeId ? 1 : 0,
      ...report,
    };
  }

  async getTeamPerformance(supervisorId: string) {
    const projects =
      await this.projectService.getSupervisedTeamContext(supervisorId);
    const projectIds = projects.map((project) => project.projectId);
    const assigneeIds = [
      ...new Set(
        projects.flatMap((project) =>
          project.assigneeId ? [project.assigneeId] : [],
        ),
      ),
    ];
    const [assignees, taskCounts] = await Promise.all([
      this.userService.findProfilesByIds(assigneeIds),
      this.taskService.getAssigneeStatusCountsAcrossProjects(
        projectIds,
        assigneeIds,
      ),
    ]);
    const taskCountsByUserId = new Map(
      taskCounts.map((counts) => [counts.userId, counts]),
    );
    const projectNamesByAssigneeId = new Map<string, Set<string>>();

    projects.forEach((project) => {
      if (project.assigneeId) {
        const projectNames =
          projectNamesByAssigneeId.get(project.assigneeId) ?? new Set<string>();
        projectNames.add(project.projectName);
        projectNamesByAssigneeId.set(project.assigneeId, projectNames);
      }
    });

    const performance = assignees
      .map((member) => {
        const counts = taskCountsByUserId.get(member.userId);
        const totalTasks = counts?.totalTasks ?? 0;
        const doneTasks = counts?.doneTasks ?? 0;
        const projectNames = [
          ...(projectNamesByAssigneeId.get(member.userId) ?? []),
        ];

        return {
          ...member,
          projectsCount: projectNames.length,
          projects: projectNames,
          totalTasks,
          todoTasks: counts?.todoTasks ?? 0,
          inProgressTasks: counts?.inProgressTasks ?? 0,
          doneTasks,
          overdueTasks: counts?.overdueTasks ?? 0,
          completionRate:
            totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        };
      })
      .sort(
        (left, right) =>
          right.completionRate - left.completionRate ||
          right.doneTasks - left.doneTasks,
      );

    const totalTasks = performance.reduce(
      (total, member) => total + member.totalTasks,
      0,
    );
    const doneTasks = performance.reduce(
      (total, member) => total + member.doneTasks,
      0,
    );

    return {
      projectsCount: projects.length,
      assigneeCount: performance.length,
      totalTasks,
      doneTasks,
      completionRate:
        totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      assignees: performance,
    };
  }
}
