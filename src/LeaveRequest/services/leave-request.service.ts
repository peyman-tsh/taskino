import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import {
  LeaveDocument,
  LeaveRecurrence,
  LeaveStatus,
} from '../LeaveRequest.schema';
import { LeaveRequestWorkflowService } from './leave-request-workflow.service';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { QueryLeaveRequestDto } from '../dto/query-leave-request.dto';
import { isValidTimeRange } from '../../common/constants/time.constants';

export interface LeaveRequestFilters {
  user?: string;
  status?: LeaveStatus;
  approvedBy?: string;
  recurrence?: LeaveRecurrence;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class LeaveRequestService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly workflowService: LeaveRequestWorkflowService,
  ) {}

  /**
   * Create a new leave request
   */
  async create(createLeaveDto: CreateLeaveRequestDto): Promise<LeaveDocument> {
    const { user, ...rest } = createLeaveDto;

    // Validate user is a valid ObjectId
    if (!Types.ObjectId.isValid(user)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Validate dates
    const startDate = new Date(rest.startDate);
    const endDate = new Date(rest.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }
    this.assertValidTimeRange(rest.startTime, rest.endTime);

    return this.repository.create({
      ...rest,
      user: new Types.ObjectId(user),
      startDate,
      endDate,
    });

  }

  /**
   * Find all leave requests with pagination and optional filters
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: LeaveRequestFilters,
  ): Promise<{
    data: LeaveDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filters?.user && Types.ObjectId.isValid(filters.user)) {
      query.user = new Types.ObjectId(filters.user);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.approvedBy && Types.ObjectId.isValid(filters.approvedBy)) {
      query.approvedBy = new Types.ObjectId(filters.approvedBy);
    }

    if (filters?.recurrence) {
      query.recurrence = filters.recurrence;
    }

    const rangeStart = filters?.startDate
      ? this.parseDate(filters.startDate, 'start date')
      : undefined;
    const rangeEnd = filters?.endDate
      ? this.parseDate(filters.endDate, 'end date')
      : undefined;
    this.assertValidDateRange(rangeStart, rangeEnd);
    if (rangeStart) query.endDate = { $gte: rangeStart };
    if (rangeEnd) query.startDate = { $lte: rangeEnd };

    this.assertValidTimeRange(filters?.startTime, filters?.endTime);
    if (filters?.startTime) query.endTime = { $gte: filters.startTime };
    if (filters?.endTime) query.startTime = { $lte: filters.endTime };

    const { data, total } = await this.repository.findPaginated(
      query,
      page,
      limit,
    );

    return {
      data,
      total,
      page,
      limit,
    };
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

  async getStatistics(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
  }> {
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

  /**
   * Find a leave request by ID
   */
  async findById(id: string): Promise<LeaveDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid leave request ID');
    }

    const leaveRequest = await this.repository.findById(id);

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest;
  }

  /**
   * Find leave requests by user ID
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: LeaveDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const { data, total } = await this.repository.findPaginated(
      { user: new Types.ObjectId(userId) },
      page,
      limit,
    );

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Update a leave request by ID
   */
  async update(
    id: string,
    updateLeaveDto: UpdateLeaveRequestDto,
  ): Promise<LeaveDocument> {
    this.validateObjectId(id, 'leave request ID');
    const leaveRequest = await this.ensureLeaveExists(id);

    const updateData = this.buildUpdateData(updateLeaveDto, leaveRequest);
    return this.updateAndPopulate(id, updateData);
  }

  private buildUpdateData(
    dto: UpdateLeaveRequestDto,
    leaveRequest: LeaveDocument,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    this.applyUserUpdate(updateData, dto);
    this.applyScheduleUpdates(updateData, dto, leaveRequest);
    this.applyReasonUpdate(updateData, dto);
    this.applyStatusUpdate(updateData, dto);
    this.applyApprovalUpdates(updateData, dto);

    return updateData;
  }

  private applyUserUpdate(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
  ): void {
    if (dto.user === undefined) return;

    this.validateObjectId(dto.user, 'user ID');
    updateData.user = new Types.ObjectId(dto.user);
  }

  private applyScheduleUpdates(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
    leaveRequest: LeaveDocument,
  ): void {
    const startDate =
      dto.startDate !== undefined
        ? this.parseDate(dto.startDate, 'start date')
        : leaveRequest.startDate;
    const endDate =
      dto.endDate !== undefined
        ? this.parseDate(dto.endDate, 'end date')
        : leaveRequest.endDate;
    this.assertValidDateRange(startDate, endDate);
    this.assertValidTimeRange(
      dto.startTime ?? leaveRequest.startTime,
      dto.endTime ?? leaveRequest.endTime,
    );

    if (dto.startDate !== undefined) updateData.startDate = startDate;
    if (dto.endDate !== undefined) updateData.endDate = endDate;
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence;
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime;
  }

  private applyReasonUpdate(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
  ): void {
    if (dto.reason !== undefined) {
      updateData.reason = dto.reason;
    }
  }

  private applyStatusUpdate(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
  ): void {
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

  private applyApprovalUpdates(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
  ): void {
    if (dto.approvedBy !== undefined) {
      this.validateObjectId(dto.approvedBy, 'approvedBy user ID');
      updateData.approvedBy = new Types.ObjectId(dto.approvedBy);
    }
    if (dto.approvedAt !== undefined) {
      updateData.approvedAt = this.parseDate(dto.approvedAt, 'approvedAt date');
    }
    if (dto.rejectionReason !== undefined) {
      updateData.rejectionReason = dto.rejectionReason;
    }
  }

  private async ensureLeaveExists(id: string): Promise<LeaveDocument> {
    const leaveRequest = await this.repository.findRawById(id);
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }
    return leaveRequest;
  }

  private validateObjectId(id: string, label: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private parseDate(value: Date | string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label} format`);
    }

    return date;
  }

  private assertValidDateRange(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }
  }

  private assertValidTimeRange(startTime?: string, endTime?: string): void {
    if (!isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('End time must be after start time');
    }
  }

  private async updateAndPopulate(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<LeaveDocument> {
    const updatedLeave = await this.repository.updateById(id, updateData);

    if (!updatedLeave) {
      throw new NotFoundException('Leave request not found');
    }

    return updatedLeave;
  }

  /**
   * Delete a leave request by ID
   */
  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid leave request ID');
    }

    const leaveRequest = await this.repository.deleteById(id);

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }
  }
  /**
   * Approve a leave request
   */
  async approveLeave(
    id: string,
    approvedBy: string,
  ): Promise<LeaveDocument> {
    return this.workflowService.approve(id, approvedBy);
  }

  approveLeaveByManager(id: string, managerId: string): Promise<LeaveDocument> {
    return this.workflowService.approveByManager(id, managerId);
  }

  /**
   * Reject a leave request
   */
  async rejectLeave(
    id: string,
    approvedBy: string,
    rejectionReason: string,
  ): Promise<LeaveDocument> {
    return this.workflowService.reject(id, approvedBy, rejectionReason);
  }
}
