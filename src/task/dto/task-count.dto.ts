import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';

export class TaskCountDto {
  @ApiProperty({ description: 'ID of the project', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'ID of the expert/specialist (to whom tasks are assigned)', example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  @IsString()
  @IsNotEmpty()
  expertId: string;
}

export class TaskCompletionStatsDto {
  @ApiProperty({ description: 'ID of the manager (who created the tasks)', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsString()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({ description: 'ID of the project', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsOptional()
  @IsString()
  projectId:string

  @ApiProperty({ description: 'ID of the expert/specialist (to whom tasks are assigned)', example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  @IsString()
  @IsNotEmpty()
  expertId: string;
}
