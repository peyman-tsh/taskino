import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveDocument } from '../LeaveRequest.schema';
import { LeaveRequestPolicyService } from './leave-request-policy.service';
import { LeaveRequestUpdateDataBuilder } from './leave-request-update-data.builder';

@Injectable()
export class LeaveRequestUpdateService {
  constructor(
    private readonly repository: LeaveRequestRepository,
    private readonly policy: LeaveRequestPolicyService,
    private readonly builder: LeaveRequestUpdateDataBuilder,
  ) {}

  async update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveDocument> {
    this.policy.toObjectId(id, 'leave request ID');
    const leave = await this.repository.findRawById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    const updatedLeave = await this.repository.updateById(
      id,
      this.builder.build(dto, leave),
    );
    if (!updatedLeave) throw new NotFoundException('Leave request not found');
    return updatedLeave;
  }
}
