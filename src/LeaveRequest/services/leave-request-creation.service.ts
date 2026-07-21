import { Injectable } from '@nestjs/common';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveDocument } from '../LeaveRequest.schema';
import { LeaveRequestPolicyService } from './leave-request-policy.service';
import { UserService } from '../../user/services/user.service';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class LeaveRequestCreationService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly policy: LeaveRequestPolicyService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveDocument> {
    const { user: requesterId, ...rest } = dto;
    const userId = this.policy.toObjectId(requesterId, 'user ID');
    const startDate = this.policy.parseDate(rest.startDate, 'date');
    const endDate = this.policy.parseDate(rest.endDate, 'date');
    this.policy.assertValidDateRange(startDate, endDate);
    this.policy.assertHourlyLeaveTimes(
      rest.recurrence,
      rest.startTime,
      rest.endTime,
    );
    this.policy.assertValidTimeRange(rest.startTime, rest.endTime);

    const leave = await this.repository.create({
      ...rest,
      user: userId,
      startDate,
      endDate,
    });

    const requester = await this.userService.findById(requesterId);
    const requesterName = `${requester.firstName} ${requester.lastName}`.trim();
    await this.notificationService.createLeaveRequestNotificationsForManagersAndSupervisors(
      requester.workField,
      requesterName,
    );

    return leave;
  }
}
