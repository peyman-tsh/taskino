import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskRecurrence, TaskStatus } from '../task.schema';

export class TaskResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: Object })
  createdBy: object;

  @ApiProperty({ type: [Object] })
  assignedTo: object[];

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiPropertyOptional()
  file?: string;

  @ApiPropertyOptional({ type: Object })
  excelFile?: object;

  @ApiPropertyOptional()
  taskComment?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  isExtraTask: boolean;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-06-07T05:30:00.000Z',
  })
  startDate?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-06-07T13:30:00.000Z',
  })
  dueDate?: Date;

  @ApiPropertyOptional({ example: '09:00' })
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  endTime?: string;

  @ApiPropertyOptional({ enum: TaskRecurrence })
  recurrence?: TaskRecurrence;

  @ApiPropertyOptional()
  doneTime?: Date;
}

export class PaginatedTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  data: TaskResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class TaskCompletionStatsResponseDto {
  @ApiProperty()
  managerId: string;

  @ApiProperty()
  expertId: string;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  pendingTasks: number;

  @ApiProperty({ example: { todo: 2, in_progress: 1 } })
  pendingByStatus: object;

  @ApiProperty({ example: { done: 4 } })
  completedByStatus: object;
}

export class TaskDateCountResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string;

  @ApiProperty()
  todoTasks: number;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  pendingTasks: number;
}

export class TaskStatusOverviewResponseDto {
  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  todoTasks: number;

  @ApiProperty()
  inProgressTasks: number;

  @ApiProperty()
  doneTasks: number;
}

export class MyTaskStatusCountsResponseDto extends TaskStatusOverviewResponseDto {
  @ApiProperty()
  userId: string;
}

export class TaskCountsByUserResponseDto extends TaskStatusOverviewResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}
