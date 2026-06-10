import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

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
}
