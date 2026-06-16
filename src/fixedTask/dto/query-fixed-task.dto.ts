import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
} from '../fixed-task.schema';

export class QueryFixedTaskDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({
    enum: FixedTaskRecurrence,
    description: 'Filter by daily, weekly, or monthly recurrence',
    example: FixedTaskRecurrence.WEEKLY,
  })
  @IsOptional()
  @IsEnum(FixedTaskRecurrence)
  recurrence?: FixedTaskRecurrence;

  @ApiPropertyOptional({
    enum: FixedTaskStatus,
    description: 'Filter by fixed task status',
    example: FixedTaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(FixedTaskStatus)
  status?: FixedTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Range start in ISO format. Returns fixed tasks ending on or after this date.',
    example: '2026-06-01T00:00:00+03:30',
  })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Range end in ISO format. Returns fixed tasks starting on or before this date.',
    example: '2026-06-30T23:59:59+03:30',
  })
  @IsOptional()
  endDate?: string;
}
