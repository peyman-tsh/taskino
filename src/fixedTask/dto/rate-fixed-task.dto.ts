import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RateFixedTaskDto {
  @ApiProperty({
    description:
      'Manager rating for the fixed task. 0-3 weak, 4-6 normal, 7-10 good.',
    minimum: 0,
    maximum: 10,
    example: 8,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  score: number;

  @ApiPropertyOptional({
    description: 'Optional manager comment for this fixed-task rating.',
    example: 'Completed with good quality.',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description:
      'Optional manager comment stored as ratingComment. Use this or comment.',
    example: 'Completed with good quality.',
  })
  @IsOptional()
  @IsString()
  ratingComment?: string;
}
