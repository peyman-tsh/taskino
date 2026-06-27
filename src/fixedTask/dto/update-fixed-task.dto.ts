import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { FixedTaskRecurrence, FixedTaskStatus } from '../fixed-task.schema';
import {
  TIME_MESSAGE,
  TIME_PATTERN,
} from '../../common/constants/time.constants';
import { FixedTaskScheduleConfigDto } from './fixed-task-schedule-config.dto';

export class UpdateFixedTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({ enum: FixedTaskRecurrence })
  @IsOptional()
  @IsEnum(FixedTaskRecurrence)
  recurrence?: FixedTaskRecurrence;

  @ApiPropertyOptional({ enum: FixedTaskStatus })
  @IsOptional()
  @IsEnum(FixedTaskStatus)
  status?: FixedTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional comment for the fixed task',
  })
  @IsOptional()
  @IsString()
  taskComment?: string;

  @ApiPropertyOptional({ type: FixedTaskScheduleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FixedTaskScheduleConfigDto)
  scheduleConfig?: FixedTaskScheduleConfigDto;

  @ApiPropertyOptional({
    description: 'Actual duration spent on the fixed task in minutes',
    example: 225,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  actualDurationMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Approved duration for the fixed task in minutes. Updating this field automatically approves timing.',
    example: 225,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  approvedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextRunAt?: string;

  @ApiPropertyOptional({
    description: 'Daily start time in 24-hour HH:mm format',
    example: '09:00',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `startTime ${TIME_MESSAGE}` })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Daily end time in 24-hour HH:mm format',
    example: '17:00',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `endTime ${TIME_MESSAGE}` })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Fixed task start date in ISO format',
    example: '2026-06-14T09:00:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fixed task end date in ISO format',
    example: '2026-06-14T17:00:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
