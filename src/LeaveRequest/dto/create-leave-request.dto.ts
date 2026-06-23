import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId, IsDateString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveRecurrence, LeaveStatus } from '../LeaveRequest.schema';
import { TIME_MESSAGE, TIME_PATTERN } from '../../common/constants/time.constants';

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

  @ApiProperty({
    description:
      'Leave recurrence/type. Use hourly when startTime and endTime are required.',
    enum: LeaveRecurrence,
    example: LeaveRecurrence.DAILY,
  })
  @IsEnum(LeaveRecurrence)
  recurrence: LeaveRecurrence;

  @ApiPropertyOptional({
    description: 'Required when recurrence is hourly',
    example: '09:00',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `startTime ${TIME_MESSAGE}` })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Required when recurrence is hourly',
    example: '17:00',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: `endTime ${TIME_MESSAGE}` })
  endTime?: string;

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
