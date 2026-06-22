import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { FixedTaskTimingApprovalStatus } from '../../fixedTask/fixed-task.schema';

export class FixedTaskTimingApprovalDto {
  @ApiProperty({
    enum: [
      FixedTaskTimingApprovalStatus.APPROVED,
      FixedTaskTimingApprovalStatus.REJECTED,
    ],
  })
  @IsIn([
    FixedTaskTimingApprovalStatus.APPROVED,
    FixedTaskTimingApprovalStatus.REJECTED,
  ])
  status:
    | FixedTaskTimingApprovalStatus.APPROVED
    | FixedTaskTimingApprovalStatus.REJECTED;

  @ApiPropertyOptional({
    description:
      'Approved standard duration. Defaults to actualDurationMinutes.',
    example: 225,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  approvedDurationMinutes?: number;
}
