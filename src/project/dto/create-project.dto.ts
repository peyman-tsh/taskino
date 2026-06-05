import { IsString, IsNotEmpty, IsArray, IsOptional, IsEnum, IsBoolean, IsDateString, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '../project.schema';

export class CreateProjectDto {
  @ApiProperty({ description: 'Title of the project', example: 'New Website Redesign' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the project', example: 'Redesign the company website with modern UI/UX' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Status of the project', enum: ProjectStatus, example: ProjectStatus.PENDING })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({ description: 'ID of the user who owns the project', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsMongoId()
  owner: string;

  @ApiProperty({
    description: 'ID of the supervisor responsible for the project. The user must have the supervisor role.',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsMongoId()
  supervisorId: string;

  @ApiPropertyOptional({ description: 'Array of user IDs to add as members', example: ['64a7b1c2d3e4f5a6b7c8d9e1', '64a7b1c2d3e4f5a6b7c8d9e2'] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  members?: string[];

  @ApiPropertyOptional({ description: 'Start date of the project', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date of the project', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Whether the project is archived', example: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
