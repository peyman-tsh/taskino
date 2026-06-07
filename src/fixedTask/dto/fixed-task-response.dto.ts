import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskResponseDto } from '../../task/dto/task-response.dto';
import { IncompleteFixedTaskDeadlineStatus } from './query-incomplete-fixed-task-report.dto';
import { FixedTaskRecurrence } from '../fixed-task.schema';

export class FixedTaskResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: Object })
  assignedTo: object;

  @ApiProperty({ type: Object })
  createdBy: object;

  @ApiPropertyOptional({ type: Object })
  projectId?: object;

  @ApiProperty({ enum: FixedTaskRecurrence })
  recurrence: FixedTaskRecurrence;

  @ApiProperty()
  description: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastGeneratedAt?: Date;

  @ApiPropertyOptional()
  nextRunAt?: Date;
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

export class IncompleteFixedTaskItemResponseDto {
  @ApiProperty()
  templateId: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: FixedTaskRecurrence })
  recurrence: FixedTaskRecurrence;

  @ApiProperty({ type: Object })
  assignedTo: object;

  @ApiPropertyOptional({ type: Object })
  project?: object;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  deadline: Date;

  @ApiProperty({ enum: IncompleteFixedTaskDeadlineStatus })
  deadlineStatus: IncompleteFixedTaskDeadlineStatus;

  @ApiProperty({ type: [TaskResponseDto] })
  generatedTasks: TaskResponseDto[];
}

export class IncompleteFixedTaskReportResponseDto {
  @ApiProperty()
  reportAt: Date;

  @ApiProperty()
  periodAt: Date;

  @ApiProperty({ type: [IncompleteFixedTaskItemResponseDto] })
  data: IncompleteFixedTaskItemResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  overdue: number;

  @ApiProperty()
  withinDeadline: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
