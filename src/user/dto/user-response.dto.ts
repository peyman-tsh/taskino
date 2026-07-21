import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkField } from '../../common/enums/work-field.enum';
import { UserPerformanceStatus, UserRole } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  mobile?: string;

  @ApiProperty({ enum: UserRole })
  roles: UserRole;

  @ApiProperty({ enum: WorkField })
  workField: WorkField;

  @ApiProperty({ example: 0 })
  score: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  progressPercentage: number;

  @ApiPropertyOptional()
  progressDate?: Date;

  @ApiProperty({ enum: UserPerformanceStatus })
  performanceStatus: UserPerformanceStatus;

  @ApiPropertyOptional()
  performanceEvaluatedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class ApproveUserResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class SpecialistProgressResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 75 })
  progressPercentage: number;

  @ApiPropertyOptional()
  progressDate?: Date;

  @ApiProperty({ minimum: 0, maximum: 100, example: 60 })
  taskProgressPercentage: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 40 })
  fixedTaskProgressPercentage: number;

  @ApiProperty({ enum: UserPerformanceStatus, example: UserPerformanceStatus.GOOD })
  performanceStatus: UserPerformanceStatus;

  @ApiProperty({ minimum: 0, example: 30 })
  score: number;
}

export class UserWorkSummaryResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ example: 12 })
  totalTasks: number;

  @ApiProperty({ example: 8 })
  completedTasks: number;

  @ApiProperty({ example: 20 })
  totalFixedTasks: number;

  @ApiProperty({ example: 15 })
  completedFixedTasks: number;

  @ApiProperty({ example: 120 })
  score: number;
}

export class UserDailyProgressListResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;

  @ApiProperty({ example: 3 })
  dayCount: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 67 })
  averageProgressPercentage: number;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    example: 78,
    description:
      'The 0-100 average manager-rating percentage of done regular tasks in the selected date range.',
  })
  doneTaskPercentage: number;

  @ApiProperty()
  total: number;

  @ApiProperty({
    type: [Object],
    description:
      'Daily progress records. doneFixedTaskProgressPercentage is the 0-100 average manager-rating percentage of done fixed-task occurrences for that Tehran day.',
  })
  data: object[];
}
