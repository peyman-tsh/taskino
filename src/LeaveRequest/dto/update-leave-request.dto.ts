import { IsString, IsDateString, IsOptional, IsEnum, IsMongoId, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveRecurrence, LeaveStatus } from '../LeaveRequest.schema';
import { TIME_MESSAGE, TIME_PATTERN } from '../../common/constants/time.constants';

export class UpdateLeaveRequestDto {
  @ApiPropertyOptional({ description: 'ID of the user requesting leave', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  user?: string;

  @ApiPropertyOptional({ description: 'Start date of the leave', example: '2026-06-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date of the leave', example: '2026-06-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: LeaveRecurrence })
  @IsOptional()
  @IsEnum(LeaveRecurrence)
  recurrence?: LeaveRecurrence;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `startTime ${TIME_MESSAGE}` })
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `endTime ${TIME_MESSAGE}` })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Reason for the leave', example: 'Personal vacation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Status of the leave request', enum: LeaveStatus, example: LeaveStatus.APPROVED })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiPropertyOptional({ description: 'ID of the user who approved/rejected the request', example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  approvedBy?: string;

  @ApiPropertyOptional({ description: 'Date when the leave was approved', example: '2026-06-10T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @ApiPropertyOptional({ description: 'Reason for rejection', example: 'Budget constraints' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
