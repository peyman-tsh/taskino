import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class FixedTaskDateRangeQueryDto {
  @ApiProperty({
    description:
      'Inclusive fixed-task start-date range beginning, in ISO format',
    example: '2026-07-01',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'Inclusive fixed-task start-date range end, in ISO format',
    example: '2026-07-31',
  })
  @IsDateString()
  to: string;
}
