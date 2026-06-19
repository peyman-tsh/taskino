import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryActiveFixedTaskDto {
  @ApiPropertyOptional({
    description: 'Filter active fixed tasks by title',
    example: 'گزارش',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
