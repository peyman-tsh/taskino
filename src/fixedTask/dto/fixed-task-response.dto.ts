import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';

export class FixedTaskResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: Object })
  assignedTo: object;

  @ApiProperty({ type: Object })
  createdBy: object;

  @ApiProperty({ enum: FixedTaskRecurrence })
  recurrence: FixedTaskRecurrence;

  @ApiProperty({ enum: FixedTaskStatus })
  status: FixedTaskStatus;

  @ApiPropertyOptional()
  doneTime?: Date;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional({ example: 225 })
  actualDurationMinutes?: number;

  @ApiPropertyOptional({ example: 225 })
  approvedDurationMinutes?: number;

  @ApiProperty({ enum: FixedTaskTimingApprovalStatus })
  timingApprovalStatus: FixedTaskTimingApprovalStatus;

  @ApiPropertyOptional()
  timingApprovedBy?: object;

  @ApiPropertyOptional()
  timingApprovedAt?: Date;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastGeneratedAt?: Date;

  @ApiPropertyOptional()
  nextRunAt?: Date;

  @ApiPropertyOptional({ example: '09:00' })
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  endTime?: string;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  endDate?: Date;
}

export class PaginatedFixedTasksResponseDto {
  @ApiProperty({ type: [FixedTaskResponseDto] })
  data: FixedTaskResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class FixedTaskStatusCountsResponseDto {
  @ApiProperty()
  totalFixedTasks: number;

  @ApiProperty()
  todoFixedTasks: number;

  @ApiProperty()
  inProgressFixedTasks: number;

  @ApiProperty()
  doneFixedTasks: number;

  @ApiProperty({
    description:
      'Todo fixed tasks that have startDate/endDate and are not expired yet',
  })
  activeDatedTodoFixedTasks: number;
}
