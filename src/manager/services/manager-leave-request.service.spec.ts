import { LeaveRequestService } from '../../LeaveRequest/services/leave-request.service';
import { ManagerLeaveRequestService } from './manager-leave-request.service';

describe('ManagerLeaveRequestService', () => {
  const leaveRequestService = {
    findAll: jest.fn(),
    approveLeaveByManager: jest.fn(),
  };
  const service = new ManagerLeaveRequestService(
    leaveRequestService as unknown as LeaveRequestService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all employee leave requests', async () => {
    leaveRequestService.findAll.mockResolvedValue({ data: [], total: 0 });

    await service.findAll({ page: 2, limit: 20 });

    expect(leaveRequestService.findAll).toHaveBeenCalledWith(2, 20);
  });

  it('approves a leave request using manager identity', async () => {
    leaveRequestService.approveLeaveByManager.mockResolvedValue({
      approvedByManger: true,
    });

    await service.approve('leave-id', 'manager-id');

    expect(leaveRequestService.approveLeaveByManager).toHaveBeenCalledWith(
      'leave-id',
      'manager-id',
    );
  });
});
