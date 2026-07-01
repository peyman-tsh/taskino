import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class DoneFixedTaskRangeQueryDto {
  @ApiProperty({
    description: 'Range start date in ISO format',
    example: '2026-07-01T00:00:00.000Z',
  })
  @IsDateString()
  from: string;

  @ApiProperty({
    description: 'Range end date in ISO format',
    example: '2026-07-31T23:59:59.999Z',
  })
  @IsDateString()
  to: string;
}
