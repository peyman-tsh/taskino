import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeaveDocument,
  LeaveStatus,
} from '../LeaveRequest.schema';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveRequestPolicyService } from './leave-request-policy.service';

@Injectable()
export class LeaveRequestWorkflowService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly policy: LeaveRequestPolicyService,
  ) {}

  approve(id: string, approvedBy: string): Promise<LeaveDocument> {
    return this.changeStatus(id, approvedBy, LeaveStatus.APPROVED);
  }

  approveByManager(id: string, managerId: string): Promise<LeaveDocument> {
    return this.changeStatus(id, managerId, LeaveStatus.APPROVED, undefined, {
      approvedByManger: true,
    });
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
    additionalUpdates: Record<string, unknown> = {},
  ): Promise<LeaveDocument> {
    this.policy.toObjectId(id, 'leave request ID');
    const approverId = this.policy.toObjectId(approvedBy, 'approver user ID');

    const leaveRequest = await this.repository.findRawById(id);
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }
    if (leaveRequest.status === LeaveStatus.APPROVED) {
      throw new BadRequestException('Leave request is already approved');
    }

    const updatedLeave = await this.repository.updateById(id, {
      status,
      approvedBy: approverId,
      approvedAt: new Date(),
      ...(rejectionReason ? { rejectionReason } : {}),
      ...additionalUpdates,
    });

    if (!updatedLeave) {
      throw new NotFoundException('Leave request not found');
    }

    return updatedLeave;
  }
}
