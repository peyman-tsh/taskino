import { Injectable } from '@nestjs/common';
import { CreateLeaveRequestDto } from '../dto/create-leave-request.dto';
import { QueryLeaveRequestDto } from '../dto/query-leave-request.dto';
import { UpdateLeaveRequestDto } from '../dto/update-leave-request.dto';
import { LeaveDocument } from '../LeaveRequest.schema';
import { LeaveRequestFilters } from '../types/leave-request.types';
import { LeaveRequestCreationService } from './leave-request-creation.service';
import { LeaveRequestDeleteService } from './leave-request-delete.service';
import { LeaveRequestQueryService } from './leave-request-query.service';
import { LeaveRequestUpdateService } from './leave-request-update.service';
import { LeaveRequestWorkflowService } from './leave-request-workflow.service';

@Injectable()
export class LeaveRequestService {
  constructor(
    private readonly creationService: LeaveRequestCreationService,
    private readonly queryService: LeaveRequestQueryService,
    private readonly updateService: LeaveRequestUpdateService,
    private readonly deleteService: LeaveRequestDeleteService,
    private readonly workflowService: LeaveRequestWorkflowService,
  ) {}

  create(dto: CreateLeaveRequestDto): Promise<LeaveDocument> {
    return this.creationService.create(dto);
  }

  findAll(page = 1, limit = 10, filters?: LeaveRequestFilters) {
    return this.queryService.findAll(page, limit, filters);
  }

  filter(query: QueryLeaveRequestDto) {
    return this.queryService.filter(query);
  }

  getStatistics() {
    return this.queryService.getStatistics();
  }

  findById(id: string): Promise<LeaveDocument> {
    return this.queryService.findById(id);
  }

  findByUserId(userId: string, page = 1, limit = 10) {
    return this.queryService.findByUserId(userId, page, limit);
  }

  update(id: string, dto: UpdateLeaveRequestDto): Promise<LeaveDocument> {
    return this.updateService.update(id, dto);
  }

  delete(id: string): Promise<void> {
    return this.deleteService.delete(id);
  }

  approveLeave(id: string, approvedBy: string): Promise<LeaveDocument> {
    return this.workflowService.approve(id, approvedBy);
  }

  approveLeaveByManager(id: string, managerId: string): Promise<LeaveDocument> {
    return this.workflowService.approveByManager(id, managerId);
  }

  rejectLeave(
    id: string,
    approvedBy: string,
    rejectionReason: string,
  ): Promise<LeaveDocument> {
    return this.workflowService.reject(id, approvedBy, rejectionReason);
  }
}
