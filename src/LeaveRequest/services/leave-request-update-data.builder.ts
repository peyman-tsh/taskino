import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { LeaveDocument, LeaveStatus } from '../LeaveRequest.schema';
import { LeaveRequestPolicyService } from './leave-request-policy.service';

@Injectable()
export class LeaveRequestUpdateDataBuilder {
  constructor(private readonly policy: LeaveRequestPolicyService) {}

  build(dto: UpdateLeaveRequestDto, leave: LeaveDocument): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    this.applyUser(updateData, dto);
    this.applySchedule(updateData, dto, leave);
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    this.applyStatus(updateData, dto);
    this.applyApproval(updateData, dto);
    return updateData;
  }

  private applyUser(updateData: Record<string, unknown>, dto: UpdateLeaveRequestDto) {
    if (dto.user !== undefined) {
      updateData.user = this.policy.toObjectId(dto.user, 'user ID');
    }
  }

  private applySchedule(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
    leave: LeaveDocument,
  ) {
    const startDate =
      dto.startDate !== undefined
        ? this.policy.parseDate(dto.startDate, 'start date')
        : leave.startDate;
    const endDate =
      dto.endDate !== undefined
        ? this.policy.parseDate(dto.endDate, 'end date')
        : leave.endDate;
    const recurrence = dto.recurrence ?? leave.recurrence;
    const startTime = dto.startTime ?? leave.startTime;
    const endTime = dto.endTime ?? leave.endTime;
    this.policy.assertValidDateRange(startDate, endDate);
    this.policy.assertHourlyLeaveTimes(recurrence, startTime, endTime);
    this.policy.assertValidTimeRange(startTime, endTime);

    if (dto.startDate !== undefined) updateData.startDate = startDate;
    if (dto.endDate !== undefined) updateData.endDate = endDate;
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence;
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime;
  }

  private applyStatus(updateData: Record<string, unknown>, dto: UpdateLeaveRequestDto) {
    if (dto.status === undefined) return;
    if (dto.status === LeaveStatus.APPROVED) {
      updateData.approvedAt = new Date();
      if (dto.approvedBy && Types.ObjectId.isValid(dto.approvedBy)) {
        updateData.approvedBy = new Types.ObjectId(dto.approvedBy);
      }
    }
    if (dto.status === LeaveStatus.REJECTED) {
      if (!dto.rejectionReason) {
        throw new BadRequestException(
          'Rejection reason is required when rejecting a leave request',
        );
      }
      updateData.rejectionReason = dto.rejectionReason;
    }
    updateData.status = dto.status;
  }

  private applyApproval(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
  ) {
    if (dto.approvedBy !== undefined) {
      updateData.approvedBy = this.policy.toObjectId(
        dto.approvedBy,
        'approvedBy user ID',
      );
    }
    if (dto.approvedAt !== undefined) {
      updateData.approvedAt = this.policy.parseDate(
        dto.approvedAt,
        'approvedAt date',
      );
    }
    if (dto.rejectionReason !== undefined) {
      updateData.rejectionReason = dto.rejectionReason;
    }
  }
}
