import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { Leave, LeaveDocument, LeaveStatus } from '../LeaveRequest.schema';
import { LeaveRequestWorkflowService } from './leave-request-workflow.service';

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectModel(Leave.name)
    private readonly leaveModel: Model<LeaveDocument>,
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

    const leaveRequest = new this.leaveModel({
      ...rest,
      user: new Types.ObjectId(user),
      startDate,
      endDate,
    });

    return leaveRequest.save();
  }

  /**
   * Find all leave requests with pagination and optional filters
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      user?: string;
      status?: LeaveStatus;
      approvedBy?: string;
    },
  ): Promise<{
    data: LeaveDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      this.leaveModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ startDate: -1 })
        .populate('user', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .exec(),
      this.leaveModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a leave request by ID
   */
  async findById(id: string): Promise<LeaveDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid leave request ID');
    }

    const leaveRequest = await this.leaveModel
      .findById(id)
      .populate('user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

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

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.leaveModel
        .find({ user: new Types.ObjectId(userId) })
        .skip(skip)
        .limit(limit)
        .sort({ startDate: -1 })
        .populate('user', 'firstName lastName email')
        .populate('approvedBy', 'firstName lastName email')
        .exec(),
      this.leaveModel.countDocuments({ user: new Types.ObjectId(userId) }).exec(),
    ]);

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
    await this.ensureLeaveExists(id);

    const updateData = this.buildUpdateData(updateLeaveDto);
    return this.updateAndPopulate(id, updateData);
  }

  private buildUpdateData(
    dto: UpdateLeaveRequestDto,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    this.applyUserUpdate(updateData, dto);
    this.applyDateUpdates(updateData, dto);
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

  private applyDateUpdates(
    updateData: Record<string, unknown>,
    dto: UpdateLeaveRequestDto,
  ): void {
    if (dto.startDate !== undefined) {
      updateData.startDate = this.parseDate(dto.startDate, 'start date');
    }
    if (dto.endDate !== undefined) {
      updateData.endDate = this.parseDate(dto.endDate, 'end date');
    }

    const startDate = updateData.startDate as Date | undefined;
    const endDate = updateData.endDate as Date | undefined;
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }
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

  private async ensureLeaveExists(id: string): Promise<void> {
    const leaveRequest = await this.leaveModel.exists({ _id: id }).exec();
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }
  }

  private validateObjectId(id: string, label: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private parseDate(value: Date, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label} format`);
    }

    return date;
  }

  private async updateAndPopulate(
    id: string,
    updateData: Record<string, unknown>,
  ): Promise<LeaveDocument> {
    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

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

    const leaveRequest = await this.leaveModel.findByIdAndDelete(id).exec();

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
