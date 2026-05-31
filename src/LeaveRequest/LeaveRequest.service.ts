import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { Leave, LeaveDocument, LeaveStatus } from './LeaveRequest.schema';

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectModel(Leave.name)
    private readonly leaveModel: Model<LeaveDocument>,
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
  async update(id: string, updateLeaveDto: UpdateLeaveRequestDto): Promise<LeaveDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid leave request ID');
    }

    const leaveRequest = await this.leaveModel.findById(id).exec();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    const updateData: Record<string, unknown> = {};

    // Handle user update
    if (updateLeaveDto.user !== undefined) {
      if (!Types.ObjectId.isValid(updateLeaveDto.user)) {
        throw new BadRequestException('Invalid user ID');
      }
      updateData.user = new Types.ObjectId(updateLeaveDto.user);
    }

    // Handle date updates
    if (updateLeaveDto.startDate !== undefined) {
      const startDate = new Date(updateLeaveDto.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid start date format');
      }
      updateData.startDate = startDate;
    }

    if (updateLeaveDto.endDate !== undefined) {
      const endDate = new Date(updateLeaveDto.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid end date format');
      }
      updateData.endDate = endDate;
    }

    // Validate date range if both dates are being updated
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.endDate as Date) < new Date(updateData.startDate as Date)) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Handle reason update
    if (updateLeaveDto.reason !== undefined) {
      updateData.reason = updateLeaveDto.reason;
    }

    // Handle status update with approval logic
    if (updateLeaveDto.status !== undefined) {
      if (updateLeaveDto.status === LeaveStatus.APPROVED) {
        updateData.approvedAt = new Date();
        if (updateLeaveDto.approvedBy && Types.ObjectId.isValid(updateLeaveDto.approvedBy)) {
          updateData.approvedBy = new Types.ObjectId(updateLeaveDto.approvedBy);
        }
      } else if (updateLeaveDto.status === LeaveStatus.REJECTED) {
        if (!updateLeaveDto.rejectionReason) {
          throw new BadRequestException('Rejection reason is required when rejecting a leave request');
        }
        updateData.rejectionReason = updateLeaveDto.rejectionReason;
      }
      updateData.status = updateLeaveDto.status;
    }

    // Handle approvedBy update
    if (updateLeaveDto.approvedBy !== undefined) {
      if (!Types.ObjectId.isValid(updateLeaveDto.approvedBy)) {
        throw new BadRequestException('Invalid approvedBy user ID');
      }
      updateData.approvedBy = new Types.ObjectId(updateLeaveDto.approvedBy);
    }

    // Handle approvedAt update
    if (updateLeaveDto.approvedAt !== undefined) {
      const approvedAt = new Date(updateLeaveDto.approvedAt);
      if (isNaN(approvedAt.getTime())) {
        throw new BadRequestException('Invalid approvedAt date format');
      }
      updateData.approvedAt = approvedAt;
    }

    // Handle rejectionReason update
    if (updateLeaveDto.rejectionReason !== undefined) {
      updateData.rejectionReason = updateLeaveDto.rejectionReason;
    }

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
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid leave request ID');
    }

    if (!Types.ObjectId.isValid(approvedBy)) {
      throw new BadRequestException('Invalid approver user ID');
    }

    const leaveRequest = await this.leaveModel.findById(id).exec();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status === LeaveStatus.APPROVED) {
      throw new BadRequestException('Leave request is already approved');
    }

    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(
        id,
        {
          status: LeaveStatus.APPROVED,
          approvedBy: new Types.ObjectId(approvedBy),
          approvedAt: new Date(),
        },
        { new: true },
      )
      .populate('user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!updatedLeave) {
      throw new NotFoundException('Leave request not found');
    }

    return updatedLeave;
  }

  /**
   * Reject a leave request
   */
  async rejectLeave(
    id: string,
    approvedBy: string,
    rejectionReason: string,
  ): Promise<LeaveDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid leave request ID');
    }

    if (!Types.ObjectId.isValid(approvedBy)) {
      throw new BadRequestException('Invalid approver user ID');
    }

    if (!rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const leaveRequest = await this.leaveModel.findById(id).exec();

    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status === LeaveStatus.APPROVED) {
      throw new BadRequestException('Leave request is already approved');
    }

    const updatedLeave = await this.leaveModel
      .findByIdAndUpdate(
        id,
        {
          status: LeaveStatus.REJECTED,
          approvedBy: new Types.ObjectId(approvedBy),
          approvedAt: new Date(),
          rejectionReason,
        },
        { new: true },
      )
      .populate('user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .exec();

    if (!updatedLeave) {
      throw new NotFoundException('Leave request not found');
    }

    return updatedLeave;
  }
}