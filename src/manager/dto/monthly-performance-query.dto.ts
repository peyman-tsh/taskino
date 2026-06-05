import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class MonthlyPerformanceQueryDto {
  @ApiPropertyOptional({
    description: 'Month number',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month = new Date().getMonth() + 1;

  @ApiPropertyOptional({
    description: 'Full year',
    example: 2026,
    minimum: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year = new Date().getFullYear();

  @ApiPropertyOptional({
    description: 'Filter performance by project ID',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsOptional()
  @IsMongoId()
  projectId?: string;
}
