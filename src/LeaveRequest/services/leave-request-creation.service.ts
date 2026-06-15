import { Injectable } from '@nestjs/common';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveDocument } from '../LeaveRequest.schema';
import { LeaveRequestPolicyService } from './leave-request-policy.service';

@Injectable()
export class LeaveRequestCreationService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly policy: LeaveRequestPolicyService,
  ) {}

  create(dto: CreateLeaveRequestDto): Promise<LeaveDocument> {
    const { user, ...rest } = dto;
    const userId = this.policy.toObjectId(user, 'user ID');
    const startDate = this.policy.parseDate(rest.startDate, 'date');
    const endDate = this.policy.parseDate(rest.endDate, 'date');
    this.policy.assertValidDateRange(startDate, endDate);
    this.policy.assertValidTimeRange(rest.startTime, rest.endTime);

    return this.repository.create({
      ...rest,
      user: userId,
      startDate,
      endDate,
    });
  }
}
