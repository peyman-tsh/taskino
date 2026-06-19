import {
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  Matches,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TaskRecurrence, TaskStatus } from '../task.schema';
import {
  TASK_DATE_TIME_MESSAGE,
  TASK_DATE_TIME_PATTERN,
} from './task-date-time.constants';
import {
  TIME_MESSAGE,
  TIME_PATTERN,
} from '../../common/constants/time.constants';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Title of the task',
    example: 'Updated login feature',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description:
      'Array kept for future multi-assignee support; currently accepts at most one user ID',
    example: ['64a7b1c2d3e4f5a6b7c8d9e1'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @ArrayMinSize(1, { message: 'A task must be assigned to exactly one user' })
  @ArrayMaxSize(1, {
    message: 'A task can currently be assigned to only one user',
  })
  @IsString({ each: true })
  assignedTo?: string[];

  @ApiPropertyOptional({
    description: 'Status of the task',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'task comment for user' })
  @IsOptional()
  @IsString()
  taskComment?: string;

  @ApiPropertyOptional({
    description: 'Whether the task is publicly visible',
    example: false,
  })
  @IsOptional()
  @Transform(({ obj, key, value }) => {
    const rawValue = obj[key];
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
    return value;
  })
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Exact task start date and time, including timezone',
    example: '2026-06-07T09:00:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  @Matches(TASK_DATE_TIME_PATTERN, {
    message: `startDate ${TASK_DATE_TIME_MESSAGE}`,
  })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Exact task deadline date and time, including timezone; must be after startDate',
    example: '2026-06-07T17:00:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  @Matches(TASK_DATE_TIME_PATTERN, {
    message: `dueDate ${TASK_DATE_TIME_MESSAGE}`,
  })
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Task end date and time used for public task expiration',
    example: '2026-06-07T17:00:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  @Matches(TASK_DATE_TIME_PATTERN, {
    message: `endDate ${TASK_DATE_TIME_MESSAGE}`,
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Task completion date and time',
    example: '2026-06-07T16:30:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  doneTime?: string;

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
    description: 'Optional task recurrence',
    enum: TaskRecurrence,
    example: TaskRecurrence.WEEKLY,
  })
  @IsOptional()
  @IsEnum(TaskRecurrence)
  recurrence?: TaskRecurrence;
}
