import { Injectable } from '@nestjs/common';
import { LeaveRequestService } from '../../LeaveRequest/services/leave-request.service';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@Injectable()
export class ManagerLeaveRequestService {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  findAll(query: PaginationQueryDto) {
    return this.leaveRequestService.findAll(query.page, query.limit);
  }

  approve(id: string, managerId: string) {
    return this.leaveRequestService.approveLeaveByManager(id, managerId);
  }
}
