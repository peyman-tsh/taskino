import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { TaskRecurrence } from '../../task/task.schema';

export class EvaluateUserPerformanceDto {
  @ApiProperty({
    enum: TaskRecurrence,
    description: 'Performance period recurrence',
    example: TaskRecurrence.WEEKLY,
  })
  @IsEnum(TaskRecurrence)
  recurrence: TaskRecurrence;

  @ApiPropertyOptional({
    description:
      'Optional reference date. The containing daily, weekly, or monthly period is evaluated.',
    example: '2026-06-11T10:00:00+03:30',
  })
  @IsOptional()
  @IsDateString()
  referenceDate?: string;
}
