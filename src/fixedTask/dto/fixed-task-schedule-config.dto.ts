import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FixedTaskScheduleConfigDto {
  @ApiPropertyOptional({
    description:
      'Weekdays when this fixed task should be generated. JavaScript format: 0=Sunday, 1=Monday, ..., 6=Saturday.',
    example: [6, 1, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({
    description:
      'Month days when this fixed task should be generated. Used for monthly recurrence.',
    example: [2, 20],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(31)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  monthDays?: number[];
}
