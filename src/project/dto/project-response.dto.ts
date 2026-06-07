import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkField } from '../../common/enums/work-field.enum';
import { ProjectStatus } from '../project.schema';

export class ProjectResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ProjectStatus })
  status: ProjectStatus;

  @ApiProperty({ enum: WorkField })
  workField: WorkField;

  @ApiProperty({ type: Object })
  owner: object;

  @ApiProperty({ type: Object })
  supervisorId: object;

  @ApiPropertyOptional({ type: Object })
  assigneeId?: object;

  @ApiProperty({
    description:
      'Public projects have no assignee; assigned projects are private',
  })
  isPublic: boolean;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  isArchived: boolean;

  @ApiProperty({ type: [Object] })
  tasks: object[];
}

export class PaginatedProjectsResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  data: ProjectResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class ProjectProgressResponseDto {
  @ApiProperty()
  projectId: string;

  @ApiProperty()
  projectName: string;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  inProgressTasks: number;

  @ApiProperty()
  pendingTasks: number;

  @ApiProperty()
  progressPercentage: number;
}

export class PaginatedProjectProgressResponseDto {
  @ApiProperty({ type: [ProjectProgressResponseDto] })
  data: ProjectProgressResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
