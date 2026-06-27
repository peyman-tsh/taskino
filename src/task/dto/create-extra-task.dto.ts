import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import {
  TASK_DATE_TIME_MESSAGE,
  TASK_DATE_TIME_PATTERN,
} from './task-date-time.constants';
import {
  TIME_MESSAGE,
  TIME_PATTERN,
} from '../../common/constants/time.constants';

export class CreateExtraTaskDto {
  @ApiProperty({
    description: 'Title of the extra task',
    example: 'Prepare extra daily report',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the extra task',
    example: 'Extra work completed by the specialist.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Extra task start date and time, including timezone',
    example: '2026-06-07T09:00:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  @Matches(TASK_DATE_TIME_PATTERN, {
    message: `startDate ${TASK_DATE_TIME_MESSAGE}`,
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Extra task start time in 24-hour HH:mm format',
    example: '09:00',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `startTime ${TIME_MESSAGE}` })
  startTime?: string;
}
