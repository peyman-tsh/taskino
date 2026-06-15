import { Types } from 'mongoose';
import { LeaveRecurrence, LeaveStatus } from '../LeaveRequest.schema';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveRequestPolicyService } from './leave-request-policy.service';
import { LeaveRequestQueryService } from './leave-request-query.service';

describe('LeaveRequestQueryService', () => {
  const repository = {
    findPaginated: jest.fn(),
    getStatusCounts: jest.fn(),
  };
  const policy = {
    isValidObjectId: jest.fn(() => true),
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
    parseDate: jest.fn((value: string) => new Date(value)),
    assertValidDateRange: jest.fn(),
    assertValidTimeRange: jest.fn(),
  };
  const service = new LeaveRequestQueryService(
    repository as unknown as LeaveRequestRepository,
    policy as unknown as LeaveRequestPolicyService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('filters leave requests by recurrence, date, and time overlap', async () => {
    const startDate = '2026-06-01T00:00:00.000Z';
    const endDate = '2026-06-07T23:59:59.000Z';
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    await service.filter({
      page: 1,
      limit: 10,
      recurrence: LeaveRecurrence.WEEKLY,
      startDate,
      endDate,
      startTime: '09:00',
      endTime: '17:00',
    });

    expect(repository.findPaginated).toHaveBeenCalledWith(
      {
        recurrence: LeaveRecurrence.WEEKLY,
        endDate: { $gte: new Date(startDate) },
        startDate: { $lte: new Date(endDate) },
        endTime: { $gte: '09:00' },
        startTime: { $lte: '17:00' },
      },
      1,
      10,
    );
  });

  it('returns leave request counts grouped by status', async () => {
    repository.getStatusCounts.mockResolvedValue([
      { _id: LeaveStatus.PENDING, count: 4 },
      { _id: LeaveStatus.APPROVED, count: 3 },
      { _id: LeaveStatus.REJECTED, count: 2 },
    ]);

    await expect(service.getStatistics()).resolves.toEqual({
      totalRequests: 9,
      pendingRequests: 4,
      approvedRequests: 3,
      rejectedRequests: 2,
    });
  });
});
