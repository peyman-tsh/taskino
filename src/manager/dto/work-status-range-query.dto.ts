import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

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
}
