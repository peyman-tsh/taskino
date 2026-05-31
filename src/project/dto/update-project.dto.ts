import { IsString, IsArray, IsOptional, IsEnum, IsDate, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '../project.schema';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Title of the project', example: 'Updated Website Redesign' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the project', example: 'Updated description for the website redesign' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Status of the project', enum: ProjectStatus, example: ProjectStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Array of user IDs to add as members', example: ['64a7b1c2d3e4f5a6b7c8d9e1', '64a7b1c2d3e4f5a6b7c8d9e2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];

  @ApiPropertyOptional({ description: 'Start date of the project', example: '2024-01-01' })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date of the project', example: '2024-12-31' })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Whether the project is archived', example: true })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}