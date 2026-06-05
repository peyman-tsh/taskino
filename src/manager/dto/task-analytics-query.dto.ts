import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class TaskAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter analytics by project ID',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string;
}
