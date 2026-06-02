import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IncreaseScoreDto {
  @ApiProperty({ description: 'User ID', example: '6a1c4ed5adce0b22a9911d44' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Score amount to add', example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  score: number;
}