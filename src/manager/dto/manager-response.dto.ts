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
  taskProgressPercentage: number;

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
  onTimeFixedTasks: number;

  @ApiProperty()
  inProgressFixedTasks: number;

  @ApiProperty()
  fixedTaskProgressPercentage: number;

  @ApiProperty()
  progressPercentage: number;

  @ApiProperty({ enum: UserPerformanceStatus })
  performanceStatus: UserPerformanceStatus;

  @ApiProperty()
  performanceEvaluatedAt: Date;
}

export class WorkStatusCountsResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  done: number;

  @ApiProperty()
  inProgress: number;

  @ApiProperty()
  todo: number;

  @ApiProperty()
  overdueUnfinished: number;
}

export class WorkStatusRangeResponseDto extends WorkStatusCountsResponseDto {
  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;

  @ApiProperty()
  evaluatedAt: Date;

  @ApiProperty({ type: WorkStatusCountsResponseDto })
  tasks: WorkStatusCountsResponseDto;

  @ApiProperty({ type: WorkStatusCountsResponseDto })
  fixedTasks: WorkStatusCountsResponseDto;
}

export class UserWorkStatusSummaryItemDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ required: false })
  firstName?: string;

  @ApiProperty({ required: false })
  lastName?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ type: WorkStatusCountsResponseDto })
  tasks: WorkStatusCountsResponseDto;

  @ApiProperty({ type: WorkStatusCountsResponseDto })
  fixedTasks: WorkStatusCountsResponseDto;
}

export class UserWorkStatusSummaryResponseDto {
  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;

  @ApiProperty()
  evaluatedAt: Date;

  @ApiProperty({ type: [UserWorkStatusSummaryItemDto] })
  users: UserWorkStatusSummaryItemDto[];
}

export class FixedTaskDocumentListResponseDto {
  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;

  @ApiProperty()
  evaluatedAt: Date;

  @ApiProperty()
  total: number;

  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ type: [Object] })
  data: object[];
}

export class FixedTaskDurationBalanceResponseDto {
  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;

  @ApiProperty({ required: false })
  userId?: string;

  @ApiProperty({ example: 480 })
  expectedDailyMinutes: number;

  @ApiProperty({ example: 360 })
  totalActualDurationMinutes: number;

  @ApiProperty({ example: 120 })
  remainingMinutes: number;
}

export {
  PaginatedUsersResponseDto,
  TaskCountsByUserResponseDto,
  TaskStatusOverviewResponseDto,
  UserResponseDto,
};
