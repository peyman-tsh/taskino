import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '../../project/project.schema';

export class SupervisorStatisticsResponseDto {
  @ApiProperty({ example: 4 })
  supervisedProjects: number;

  @ApiProperty({ example: 12 })
  supervisedProjectsInProgressTasks: number;

  @ApiProperty({ example: 30 })
  participatingProjectsDoneTasks: number;

  @ApiProperty({ example: 8 })
  supervisorDoneTasks: number;
}

export class SupervisorProjectSummaryDto {
  @ApiProperty({ example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  projectId: string;

  @ApiProperty({ example: 'Website Redesign' })
  title: string;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.IN_PROGRESS })
  status: ProjectStatus;

  @ApiProperty({ example: false })
  isArchived: boolean;

  @ApiProperty({ example: 5 })
  assigneeCount: number;

  @ApiProperty({ example: 20 })
  totalTasks: number;

  @ApiProperty({ example: 7 })
  inProgressTasks: number;

  @ApiProperty({ example: 10 })
  doneTasks: number;
}

export class SupervisorProjectsResponseDto {
  @ApiProperty({ type: [SupervisorProjectSummaryDto] })
  data: SupervisorProjectSummaryDto[];

  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}

export class ProjectAssigneeProfileResponseDto {
  @ApiProperty({ example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  userId: string;

  @ApiProperty({ example: 'Ali' })
  firstName: string;

  @ApiProperty({ example: 'Ahmadi' })
  lastName: string;

  @ApiProperty({ example: 'ali@example.com' })
  email: string;

  @ApiProperty({ example: '09121234567', required: false })
  mobile?: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class ProjectAssigneeResponseDto {
  @ApiProperty({ example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  projectId: string;

  @ApiProperty({ example: 'Website Redesign' })
  projectName: string;

  @ApiProperty({ type: ProjectAssigneeProfileResponseDto, nullable: true })
  assignee: ProjectAssigneeProfileResponseDto | null;
}

export class AssigneePerformanceResponseDto extends ProjectAssigneeProfileResponseDto {
  @ApiProperty({ example: 100 })
  score: number;

  @ApiProperty({ example: 12 })
  totalTasks: number;

  @ApiProperty({ example: 2 })
  todoTasks: number;

  @ApiProperty({ example: 4 })
  inProgressTasks: number;

  @ApiProperty({ example: 6 })
  doneTasks: number;

  @ApiProperty({ example: 50 })
  completionRate: number;
}

export class ProjectAssigneePerformanceResponseDto {
  @ApiProperty({ example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  projectId: string;

  @ApiProperty({ example: 'Website Redesign' })
  projectName: string;

  @ApiProperty({ type: AssigneePerformanceResponseDto, nullable: true })
  assignee: AssigneePerformanceResponseDto | null;
}

export class SupervisorProjectReportResponseDto {
  @ApiProperty({ example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  projectId: string;

  @ApiProperty({ example: 'Website Redesign' })
  projectName: string;

  @ApiProperty({ example: 5 })
  assigneeCount: number;

  @ApiProperty({ example: 20 })
  totalTasks: number;

  @ApiProperty({ example: 3 })
  todoTasks: number;

  @ApiProperty({ example: 7 })
  inProgressTasks: number;

  @ApiProperty({ example: 10 })
  doneTasks: number;

  @ApiProperty({ example: 2 })
  overdueTasks: number;

  @ApiProperty({ example: 50 })
  completionRate: number;
}

export class TeamAssigneePerformanceResponseDto extends AssigneePerformanceResponseDto {
  @ApiProperty({ example: 2 })
  projectsCount: number;

  @ApiProperty({
    type: [String],
    example: ['Website Redesign', 'Mobile Application'],
  })
  projects: string[];

  @ApiProperty({ example: 1 })
  overdueTasks: number;
}

export class SupervisorTeamPerformanceResponseDto {
  @ApiProperty({ example: 3 })
  projectsCount: number;

  @ApiProperty({ example: 12 })
  assigneeCount: number;

  @ApiProperty({ example: 80 })
  totalTasks: number;

  @ApiProperty({ example: 45 })
  doneTasks: number;

  @ApiProperty({ example: 56 })
  completionRate: number;

  @ApiProperty({ type: [TeamAssigneePerformanceResponseDto] })
  assignees: TeamAssigneePerformanceResponseDto[];
}
