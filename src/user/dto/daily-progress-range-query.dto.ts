import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class DailyProgressRangeQueryDto {
  @ApiProperty({
    description: 'Range start date in ISO format',
    example: '2026-07-01',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'Range end date in ISO format',
    example: '2026-07-06',
  })
  @IsDateString()
  to: string;
}
