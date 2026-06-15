import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveRequestPolicyService } from './leave-request-policy.service';

@Injectable()
export class LeaveRequestDeleteService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly policy: LeaveRequestPolicyService,
  ) {}

  async delete(id: string): Promise<void> {
    this.policy.toObjectId(id, 'leave request ID');
    const leaveRequest = await this.repository.deleteById(id);
    if (!leaveRequest) throw new NotFoundException('Leave request not found');
  }
}
