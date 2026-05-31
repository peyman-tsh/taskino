import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMemberRole } from '../member.schema';

export class CreateProjectMemberDto {
  @ApiProperty({ description: 'ID of the project', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsString()
  @IsNotEmpty()
  project: string;

  @ApiProperty({ description: 'ID of the user', example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiPropertyOptional({ description: 'Role of the member in the project', enum: ProjectMemberRole, example: ProjectMemberRole.MEMBER })
  @IsOptional()
  @IsEnum(ProjectMemberRole)
  role?: ProjectMemberRole;

  @ApiPropertyOptional({ description: 'Whether the member is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}