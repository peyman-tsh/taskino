import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { FixedTaskRecurrence, FixedTaskStatus } from '../fixed-task.schema';
import {
  TIME_MESSAGE,
  TIME_PATTERN,
} from '../../common/constants/time.constants';

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
}
