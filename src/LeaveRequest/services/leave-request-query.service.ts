import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryLeaveRequestDto } from '../dto/query-leave-request.dto';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveDocument, LeaveStatus } from '../LeaveRequest.schema';
import { LeaveRequestFilters } from '../types/leave-request.types';
import { LeaveRequestPolicyService } from './leave-request-policy.service';

@Injectable()
export class LeaveRequestQueryService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly policy: LeaveRequestPolicyService,
  ) {}

  async findAll(page = 1, limit = 10, filters?: LeaveRequestFilters) {
    const { data, total } = await this.repository.findPaginated(
      this.buildFilter(filters),
      page,
      limit,
    );
    return { data, total, page, limit };
  }

  filter(query: QueryLeaveRequestDto) {
    return this.findAll(query.page, query.limit, {
      user: query.user,
      status: query.status,
      approvedBy: query.approvedBy,
      recurrence: query.recurrence,
      startDate: query.startDate,
      endDate: query.endDate,
      startTime: query.startTime,
      endTime: query.endTime,
    });
  }

  async findById(id: string): Promise<LeaveDocument> {
    this.policy.toObjectId(id, 'leave request ID');
    const leaveRequest = await this.repository.findById(id);
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }
    return leaveRequest;
  }

  async findByUserId(userId: string, page = 1, limit = 10) {
    const { data, total } = await this.repository.findPaginated(
      { user: this.policy.toObjectId(userId, 'user ID') },
      page,
      limit,
    );
    return { data, total, page, limit };
  }

  async getStatistics() {
    const statusCounts = await this.repository.getStatusCounts();
    const counts = statusCounts.reduce<Record<LeaveStatus, number>>(
      (result, item) => {
        result[item._id] = item.count;
        return result;
      },
      {
        [LeaveStatus.PENDING]: 0,
        [LeaveStatus.APPROVED]: 0,
        [LeaveStatus.REJECTED]: 0,
      },
    );

    return {
      totalRequests:
        counts[LeaveStatus.PENDING] +
        counts[LeaveStatus.APPROVED] +
        counts[LeaveStatus.REJECTED],
      pendingRequests: counts[LeaveStatus.PENDING],
      approvedRequests: counts[LeaveStatus.APPROVED],
      rejectedRequests: counts[LeaveStatus.REJECTED],
    };
  }

  private buildFilter(filters?: LeaveRequestFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (filters?.user && this.policy.isValidObjectId(filters.user)) {
      query.user = this.policy.toObjectId(filters.user, 'user ID');
    }
    if (filters?.status) query.status = filters.status;
    if (filters?.approvedBy && this.policy.isValidObjectId(filters.approvedBy)) {
      query.approvedBy = this.policy.toObjectId(filters.approvedBy, 'approvedBy user ID');
    }
    if (filters?.recurrence) query.recurrence = filters.recurrence;

    const rangeStart = filters?.startDate
      ? this.policy.parseDate(filters.startDate, 'start date')
      : undefined;
    const rangeEnd = filters?.endDate
      ? this.policy.parseDate(filters.endDate, 'end date')
      : undefined;
    this.policy.assertValidDateRange(rangeStart, rangeEnd);
    if (rangeStart) query.endDate = { $gte: rangeStart };
    if (rangeEnd) query.startDate = { $lte: rangeEnd };

    this.policy.assertValidTimeRange(filters?.startTime, filters?.endTime);
    if (filters?.startTime) query.endTime = { $gte: filters.startTime };
    if (filters?.endTime) query.startTime = { $lte: filters.endTime };
    return query;
  }
}
