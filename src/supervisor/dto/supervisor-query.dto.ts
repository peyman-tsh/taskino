import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  TaskRecurrence,
  TaskStatus,
} from '../../task/task.schema';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';

export class SupervisorRecurrenceQueryDto {
  @ApiPropertyOptional({
    enum: TaskRecurrence,
    description: 'Optional daily, weekly, or monthly filter',
  })
  @IsOptional()
  @IsEnum(TaskRecurrence)
  recurrence?: TaskRecurrence;
}

export class SupervisorPaginationQueryDto extends SupervisorRecurrenceQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}

export class SupervisorTasksQueryDto extends SupervisorPaginationQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

export class SupervisorFixedTasksQueryDto extends SupervisorPaginationQueryDto {
  @ApiPropertyOptional({ enum: FixedTaskStatus })
  @IsOptional()
  @IsEnum(FixedTaskStatus)
  status?: FixedTaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
