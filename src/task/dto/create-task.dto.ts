import { ArrayMaxSize, IsString, IsNotEmpty, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';

export class CreateTaskDto {
  @ApiProperty({ description: 'Title of the task', example: 'Implement login feature' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'ID of the user who created the task (Manager)', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;


  @ApiPropertyOptional({ description: 'ID of the project this task belongs to', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsOptional()
  @IsString()
  projectId?: string;


  @ApiPropertyOptional({
    description: 'Array kept for future multi-assignee support; currently accepts at most one user ID',
    example: ['64a7b1c2d3e4f5a6b7c8d9e1'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1, { message: 'A task can currently be assigned to only one user' })
  @IsString({ each: true })
  assignedTo?: string[];
  @ApiPropertyOptional({ description: 'Status of the task', enum: TaskStatus, example: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Description of the task', example: 'The login feature should support email and password authentication.' })
  @IsOptional()
  @IsString()
  description?: string;


  @ApiPropertyOptional({ description: 'Comments related to the task', example: 'This task is high priority.' })
  @IsOptional()
  @IsString()
  taskComment?: string;

  @ApiPropertyOptional({description: 'start date of task', example: '2026-06-02T10:45:30.123Z'})
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({description: 'due date of task', example: '2026-06-02T10:45:30.123Z'})
  @IsOptional()
  @IsString()
  dueDate?: string;
}
