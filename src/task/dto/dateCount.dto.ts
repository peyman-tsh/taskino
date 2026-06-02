import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DateCountDto {
  @ApiProperty({ description: 'Project ID' })
  @IsNotEmpty()
  @IsString()
  projectId!: string;

  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-01-01' })
  @IsNotEmpty()
  @IsDateString()
  startdate!: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2026-01-31' })
  @IsNotEmpty()
  @IsDateString()
  enddate!: string;
}