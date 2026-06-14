import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FixedTaskRecurrence, FixedTaskStatus } from '../fixed-task.schema';

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
