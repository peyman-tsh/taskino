import { IsString, IsNotEmpty, IsDate, IsOptional, IsEnum, IsMongoId, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveStatus } from '../LeaveRequest.schema';

export class CreateLeaveRequestDto {
  @ApiProperty({ description: 'ID of the user requesting leave', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  user: string;

  @ApiProperty({ description: 'Start date of the leave', example: '2026-06-15T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'End date of the leave', example: '2026-06-20T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ description: 'Reason for the leave', example: 'Personal vacation' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Status of the leave request', enum: LeaveStatus, example: LeaveStatus.PENDING })
  @IsOptional()
  @IsEnum(LeaveStatus)
  status?: LeaveStatus;

  @ApiProperty({ description: 'ID of the user who approved/rejected the request', example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  approvedBy?: string;
}