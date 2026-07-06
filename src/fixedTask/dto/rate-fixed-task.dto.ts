import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RateFixedTaskDto {
  @ApiProperty({
    description: 'Manager rating for the fixed task. 0 is weak, 1-3 normal, 4-5 good.',
    minimum: 0,
    maximum: 5,
    example: 4,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
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
