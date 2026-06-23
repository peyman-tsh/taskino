import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';

export class WorkStatusRangeQueryDto {
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

  @ApiProperty({
    description: 'Optional user ID to return the summary for one assigned user',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;
}
