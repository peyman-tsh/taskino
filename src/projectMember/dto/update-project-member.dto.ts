import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMemberRole } from '../member.schema';

export class UpdateProjectMemberDto {
  @ApiPropertyOptional({ description: 'Role of the member in the project', enum: ProjectMemberRole, example: ProjectMemberRole.MANAGER })
  @IsOptional()
  @IsEnum(ProjectMemberRole)
  role?: ProjectMemberRole;

  @ApiPropertyOptional({ description: 'Whether the member is active', example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}