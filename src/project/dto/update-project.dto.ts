import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsMongoId } from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'ID of the supervisor responsible for the project. The user must have the supervisor role.',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsOptional()
  @IsMongoId()
  supervisorId?: string;

  @ApiPropertyOptional({ description: 'Start date of the project', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date of the project', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Whether the project is archived', example: true })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
