import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { FixedTaskRecurrence, FixedTaskStatus } from '../fixed-task.schema';
import {
  TIME_MESSAGE,
  TIME_PATTERN,
} from '../../common/constants/time.constants';

export class CreateFixedTaskDto {
  @ApiProperty({ example: 'بررسی گزارش روزانه فروش' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Single user responsible for this fixed task' })
  @IsMongoId()
  assignedTo: string;

  @ApiProperty({
    enum: FixedTaskRecurrence,
    example: FixedTaskRecurrence.DAILY,
  })
  @IsEnum(FixedTaskRecurrence)
  recurrence: FixedTaskRecurrence;

  @ApiPropertyOptional({ enum: FixedTaskStatus, default: FixedTaskStatus.TODO })
  @IsOptional()
  @IsEnum(FixedTaskStatus)
  status?: FixedTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Next generation time in ISO format' })
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
