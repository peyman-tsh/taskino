import { LeaveRequestCreationService } from './leave-request-creation.service';
import { LeaveRequestDeleteService } from './leave-request-delete.service';
import { LeaveRequestQueryService } from './leave-request-query.service';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestUpdateService } from './leave-request-update.service';
import { LeaveRequestWorkflowService } from './leave-request-workflow.service';

describe('LeaveRequestService', () => {
  const creationService = { create: jest.fn() };
  const queryService = {
    findAll: jest.fn(),
    filter: jest.fn(),
    getStatistics: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
  };
  const updateService = { update: jest.fn() };
  const deleteService = { delete: jest.fn() };
  const workflowService = {
    approve: jest.fn(),
    approveByManager: jest.fn(),
    reject: jest.fn(),
  };
  const service = new LeaveRequestService(
    creationService as unknown as LeaveRequestCreationService,
    queryService as unknown as LeaveRequestQueryService,
    updateService as unknown as LeaveRequestUpdateService,
    deleteService as unknown as LeaveRequestDeleteService,
    workflowService as unknown as LeaveRequestWorkflowService,
  );

  it('delegates existing API operations to focused services', () => {
    service.create({} as never);
    service.findAll(1, 10);
    service.filter({} as never);
    service.getStatistics();
    service.findById('leave-id');
    service.findByUserId('user-id', 1, 10);
    service.update('leave-id', {});
    service.delete('leave-id');
    service.approveLeave('leave-id', 'approver-id');
    service.approveLeaveByManager('leave-id', 'manager-id');
    service.rejectLeave('leave-id', 'approver-id', 'reason');

    expect(creationService.create).toHaveBeenCalled();
    expect(queryService.findAll).toHaveBeenCalled();
    expect(queryService.filter).toHaveBeenCalled();
    expect(queryService.getStatistics).toHaveBeenCalled();
    expect(queryService.findById).toHaveBeenCalled();
    expect(queryService.findByUserId).toHaveBeenCalled();
    expect(updateService.update).toHaveBeenCalled();
    expect(deleteService.delete).toHaveBeenCalled();
    expect(workflowService.approve).toHaveBeenCalled();
    expect(workflowService.approveByManager).toHaveBeenCalled();
    expect(workflowService.reject).toHaveBeenCalled();
  });
});
