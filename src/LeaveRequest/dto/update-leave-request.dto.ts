import { IsString, IsDate, IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveStatus } from '../LeaveRequest.schema';

export class UpdateLeaveRequestDto {
  @ApiPropertyOptional({ description: 'ID of the user requesting leave', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  user?: string;

  @ApiPropertyOptional({ description: 'Start date of the leave', example: '2026-06-15T00:00:00.000Z' })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date of the leave', example: '2026-06-20T00:00:00.000Z' })
  @IsOptional()
  @IsDate()
  endDate?: Date;

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
  @IsDate()
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'Reason for rejection', example: 'Budget constraints' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}