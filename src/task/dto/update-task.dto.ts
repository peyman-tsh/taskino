import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Title of the task', example: 'Updated login feature' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Array of user IDs to assign the task to (Specialists/Supervisors)', example: ['64a7b1c2d3e4f5a6b7c8d9e1', '64a7b1c2d3e4f5a6b7c8d9e2'] })
  @IsOptional()
  @IsArray()
  assignedTo?: string[];

  @ApiPropertyOptional({ description: 'Status of the task', enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({description:"task comment for user"})
  @IsOptional()
  taskComment?:string
}