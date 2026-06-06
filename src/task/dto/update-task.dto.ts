import { ArrayMaxSize, ArrayMinSize, IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Title of the task', example: 'Updated login feature' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Array kept for future multi-assignee support; currently accepts at most one user ID',
    example: ['64a7b1c2d3e4f5a6b7c8d9e1'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'A task must be assigned to exactly one user' })
  @ArrayMaxSize(1, { message: 'A task can currently be assigned to only one user' })
  @IsString({ each: true })
  assignedTo?: string[];

  @ApiPropertyOptional({ description: 'Status of the task', enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({description:"task comment for user"})
  @IsOptional()
  taskComment?:string
}
