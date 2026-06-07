import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { FixedTaskRecurrence } from '../fixed-task.schema';

export enum IncompleteFixedTaskDeadlineStatus {
  OVERDUE = 'overdue',
  WITHIN_DEADLINE = 'within_deadline',
}

export class QueryIncompleteFixedTaskReportDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({ enum: FixedTaskRecurrence })
  @IsOptional()
  @IsEnum(FixedTaskRecurrence)
  recurrence?: FixedTaskRecurrence;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional({ enum: IncompleteFixedTaskDeadlineStatus })
  @IsOptional()
  @IsEnum(IncompleteFixedTaskDeadlineStatus)
  deadlineStatus?: IncompleteFixedTaskDeadlineStatus;

  @ApiPropertyOptional({
    description: 'ISO date inside the daily, weekly, or monthly period being reported',
  })
  @IsOptional()
  @IsDateString()
  periodAt?: string;

  @ApiPropertyOptional({
    description: 'ISO date used to determine whether the selected period deadline has passed',
  })
  @IsOptional()
  @IsDateString()
  reportAt?: string;
}
