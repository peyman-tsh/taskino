import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Leave,
  LeaveDocument,
  LeaveStatus,
} from '../LeaveRequest.schema';

@Injectable()
export class LeaveRequestWorkflowService {
  constructor(
    @InjectModel(Leave.name)
    private readonly leaveModel: Model<LeaveDocument>,
  ) {}

  approve(id: string, approvedBy: string): Promise<LeaveDocument> {
    return this.changeStatus(id, approvedBy, LeaveStatus.APPROVED);
  }

  reject(
    id: string,
    approvedBy: string,
    rejectionReason: string,
  ): Promise<LeaveDocument> {
    if (!rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    return this.changeStatus(
      id,
      approvedBy,
      LeaveStatus.REJECTED,
      rejectionReason,
    );
  }

  private async changeStatus(
    id: string,
    approvedBy: string,
    status: LeaveStatus,
    rejectionReason?: string,
  ): Promise<LeaveDocument> {
    this.validateId(id, 'leave request ID');
    this.validateId(approvedBy, 'approver user ID');

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
          status,
          approvedBy: new Types.ObjectId(approvedBy),
          approvedAt: new Date(),
          ...(rejectionReason ? { rejectionReason } : {}),
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

  private validateId(id: string, label: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
