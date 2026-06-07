import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';

export class TaskResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: Object })
  createdBy: object;

  @ApiProperty({ type: [Object] })
  assignedTo: object[];

  @ApiPropertyOptional({ type: Object })
  projectId?: object;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiPropertyOptional()
  fixedTaskTemplateId?: string;

  @ApiPropertyOptional()
  file?: string;

  @ApiPropertyOptional()
  taskComment?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isPublic: boolean;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  dueDate?: Date;
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
  projectId: string;

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
