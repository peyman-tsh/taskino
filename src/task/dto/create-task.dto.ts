import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Array of user IDs to assign the task to (Specialists/Supervisors)', example: ['64a7b1c2d3e4f5a6b7c8d9e1', '64a7b1c2d3e4f5a6b7c8d9e2'] })
  @IsOptional()
  @IsArray()
  assignedTo?: string[];

  @ApiPropertyOptional({ description: 'Status of the task', enum: TaskStatus, example: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}