import {
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  Matches,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';
import {
  TASK_DATE_TIME_MESSAGE,
  TASK_DATE_TIME_PATTERN,
} from './task-date-time.constants';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Title of the task',
    example: 'Implement login feature',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'ID of the user who created the task (Manager)',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
  })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiPropertyOptional({
    description: 'ID of the project this task belongs to',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description:
      'Exactly one responsible user ID. The array shape is retained for future compatibility.',
    example: ['64a7b1c2d3e4f5a6b7c8d9e1'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'A task must be assigned to exactly one user' })
  @ArrayMaxSize(1, {
    message: 'A task can currently be assigned to only one user',
  })
  @IsString({ each: true })
  assignedTo: string[];
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
}
