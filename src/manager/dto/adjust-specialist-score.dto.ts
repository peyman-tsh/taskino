import { ApiProperty } from '@nestjs/swagger';
import { IsInt, NotEquals } from 'class-validator';

export class AdjustSpecialistScoreDto {
  @ApiProperty({
    description:
      'Positive value adds score and negative value subtracts score. The final score cannot be less than zero.',
    example: 15,
  })
  @IsInt()
  @NotEquals(0)
  score: number;
}
