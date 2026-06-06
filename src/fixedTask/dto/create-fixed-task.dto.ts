import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FixedTaskRecurrence } from '../fixed-task.schema';

export class CreateFixedTaskDto {
  @ApiProperty({ example: 'بررسی گزارش روزانه فروش' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Single user responsible for this fixed task' })
  @IsMongoId()
  assignedTo: string;

  @ApiPropertyOptional({ description: 'Optional related project ID' })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiProperty({ enum: FixedTaskRecurrence, example: FixedTaskRecurrence.DAILY })
  @IsEnum(FixedTaskRecurrence)
  recurrence: FixedTaskRecurrence;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Next generation time in ISO format' })
  @IsOptional()
  @IsDateString()
  nextRunAt?: string;
}
