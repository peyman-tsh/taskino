import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class QueryActiveFixedTaskDto {
  @ApiPropertyOptional({
    description: 'Filter active fixed tasks by assigned user ID',
    example: '6a2ecfdb0c6b5da82182e9fa',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;
}
