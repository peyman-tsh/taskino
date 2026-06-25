import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class FixedTaskDurationBalanceQueryDto {
  @ApiProperty({
    description: 'Range start date in ISO format',
    example: '2026-06-01',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'Range end date in ISO format',
    example: '2026-06-30',
  })
  @IsDateString()
  to: string;

  @ApiPropertyOptional({
    description: 'Optional assigned user ID filter',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;
}
