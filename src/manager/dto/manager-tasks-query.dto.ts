import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TaskRecurrence } from '../../task/task.schema';

export class ManagerTasksQueryDto {
  @ApiPropertyOptional({
    enum: TaskRecurrence,
    description: 'Filter Task and FixedTask records by recurrence',
    example: TaskRecurrence.WEEKLY,
  })
  @IsOptional()
  @IsEnum(TaskRecurrence)
  recurrence?: TaskRecurrence;
}
