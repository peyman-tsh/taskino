import { ApiProperty } from '@nestjs/swagger';
import {
  TaskCountsByUserResponseDto,
  TaskStatusOverviewResponseDto,
} from '../../task/dto/task-response.dto';
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from '../../user/dto/user-response.dto';
import {
  UserPerformanceStatus,
  UserRole,
} from '../../user/schemas/user.schema';

export class ManagerStatisticsResponseDto {
  @ApiProperty()
  openTasks: number;

  @ApiProperty()
  activeUsers: number;
}

export class ManagerAllTasksResponseDto {
  @ApiProperty({ nullable: true, example: 'weekly' })
  recurrence: string | null;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  totalFixedTasks: number;

  @ApiProperty({ type: [Object] })
  tasks: object[];

  @ApiProperty({ type: [Object] })
  fixedTasks: object[];
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

  @ApiProperty({ type: [MonthlyUserPerformanceItemDto] })
  users: MonthlyUserPerformanceItemDto[];
}

export class UserProgressResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  onTimeTasks: number;

  @ApiProperty()
  inProgressTasks: number;

  @ApiProperty()
  totalFixedTasks: number;

  @ApiProperty()
  completedFixedTasks: number;

  @ApiProperty()
  inProgressFixedTasks: number;

  @ApiProperty()
  progressPercentage: number;

  @ApiProperty({ enum: UserPerformanceStatus })
  performanceStatus: UserPerformanceStatus;

  @ApiProperty()
  performanceEvaluatedAt: Date;
}

export {
  PaginatedUsersResponseDto,
  TaskCountsByUserResponseDto,
  TaskStatusOverviewResponseDto,
  UserResponseDto,
};
