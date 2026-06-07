import { ApiProperty } from '@nestjs/swagger';
import {
  PaginatedProjectProgressResponseDto,
  ProjectProgressResponseDto,
  ProjectResponseDto,
} from '../../project/dto/project-response.dto';
import {
  TaskCountsByUserResponseDto,
  TaskStatusOverviewResponseDto,
} from '../../task/dto/task-response.dto';
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from '../../user/dto/user-response.dto';

export class ManagerStatisticsResponseDto {
  @ApiProperty()
  activeProjects: number;

  @ApiProperty()
  openTasks: number;

  @ApiProperty()
  activeUsers: number;
}

export class ProjectActivationResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ProjectResponseDto })
  project: ProjectResponseDto;
}

export class ManagerProjectAssigneeDto {
  @ApiProperty({ type: Object })
  user: object;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isActive: boolean;
}

export class ManagerProjectAssigneeResponseDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty({ type: ManagerProjectAssigneeDto, nullable: true })
  assignee: ManagerProjectAssigneeDto | null;
}

export class MonthlyUserPerformanceItemDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  inProgressTasks: number;

  @ApiProperty()
  pendingTasks: number;

  @ApiProperty()
  completionRate: number;
}

export class MonthlyUserPerformanceResponseDto {
  @ApiProperty()
  month: number;

  @ApiProperty()
  year: number;

  @ApiProperty({ required: false })
  projectId?: string;

  @ApiProperty({ type: [MonthlyUserPerformanceItemDto] })
  users: MonthlyUserPerformanceItemDto[];
}

export {
  PaginatedProjectProgressResponseDto,
  PaginatedUsersResponseDto,
  ProjectProgressResponseDto,
  TaskCountsByUserResponseDto,
  TaskStatusOverviewResponseDto,
  UserResponseDto,
};
