import {
  ArrayMaxSize,
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateTaskDto {
  @ApiProperty({
    description: 'Title of the task',
    example: 'Implement login feature',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description:
      'Ignored when sent by the client; the creator ID is always taken from JWT',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
  })
  @IsOptional()
  @IsString()
  createdBy: string;

  @ApiPropertyOptional({
    description:
      'Optional responsible user ID. When omitted, the task is created without an assignee.',
    example: ['64a7b1c2d3e4f5a6b7c8d9e1'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? value
      : Array.isArray(value)
        ? value
        : [value],
  )
  @ArrayMaxSize(1, {
    message: 'A task can currently be assigned to only one user',
  })
  @IsString({ each: true })
  assignedTo?: string[];
  @ApiPropertyOptional({
    description: 'Status of the task',
    enum: TaskStatus,
    example: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Description of the task',
    example:
      'The login feature should support email and password authentication.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Comments related to the task',
    example: 'This task is high priority.',
  })
  @IsOptional()
  @IsString()
  taskComment?: string;

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
