import {
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';
import {
  TASK_DATE_TIME_MESSAGE,
  TASK_DATE_TIME_PATTERN,
} from './task-date-time.constants';

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
}
