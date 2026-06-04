import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, Allow } from 'class-validator';
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


  @ApiPropertyOptional({ description: 'Array of user IDs to assign the task to (Specialists/Supervisors)', example: ['64a7b1c2d3e4f5a6b7c8d9e1', '64a7b1c2d3e4f5a6b7c8d9e2'] })
@IsOptional()
@IsArray()
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