import { ApiProperty } from '@nestjs/swagger';
import { TaskRecurrence } from '../../task/task.schema';
import {
  UserPerformanceStatus,
  UserRole,
} from '../../user/schemas/user.schema';

export class SupervisorStatisticsResponseDto {
  @ApiProperty({ nullable: true, enum: TaskRecurrence })
  recurrence: TaskRecurrence | null;

  @ApiProperty()
  supervisedTasks: number;

  @ApiProperty()
  supervisedFixedTasks: number;

  @ApiProperty()
  supervisedInProgressTasks: number;

  @ApiProperty()
  supervisedInProgressFixedTasks: number;

  @ApiProperty()
  myInProgressTasks: number;

  @ApiProperty()
  myInProgressFixedTasks: number;

  @ApiProperty()
  mySuccessfulTasks: number;

  @ApiProperty()
  myOnTimeSuccessfulTasks: number;

  @ApiProperty({
    description:
      'Completed regular tasks assigned by the supervisor to members and not expired yet',
  })
  activeCompletedSupervisedTasks: number;

  @ApiProperty({
    description:
      'Completed fixed tasks assigned by the supervisor to members and not expired yet',
  })
  activeCompletedSupervisedFixedTasks: number;
}

export class SupervisorMemberResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  mobile?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  score: number;

  @ApiProperty()
  progressPercentage: number;

  @ApiProperty({ enum: UserPerformanceStatus })
  performanceStatus: UserPerformanceStatus;

  @ApiProperty({ required: false })
  performanceEvaluatedAt?: Date;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completedTasks: number;

  @ApiProperty()
  totalFixedTasks: number;

  @ApiProperty()
  completedFixedTasks: number;
}

export class PaginatedSupervisorMembersResponseDto {
  @ApiProperty({ type: [SupervisorMemberResponseDto] })
  data: SupervisorMemberResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty({ nullable: true, enum: TaskRecurrence })
  recurrence: TaskRecurrence | null;
}

export class SupervisorWorkFieldSpecialistResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  mobile?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  workField: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  score: number;

  @ApiProperty()
  progressPercentage: number;

  @ApiProperty({ enum: UserPerformanceStatus })
  performanceStatus: UserPerformanceStatus;
}

export class PaginatedSupervisorWorkFieldSpecialistsResponseDto {
  @ApiProperty({ type: [SupervisorWorkFieldSpecialistResponseDto] })
  data: SupervisorWorkFieldSpecialistResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  workField: string;
}
