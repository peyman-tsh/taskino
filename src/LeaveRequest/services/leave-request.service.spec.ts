import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  LeaveDocument,
  LeaveRecurrence,
  LeaveStatus,
} from '../LeaveRequest.schema';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestWorkflowService } from './leave-request-workflow.service';

describe('LeaveRequestService', () => {
  const userId = new Types.ObjectId();
  const leaveId = new Types.ObjectId();
  const repository = {
    create: jest.fn(),
    findPaginated: jest.fn(),
    findRawById: jest.fn(),
    updateById: jest.fn(),
  };
  const workflowService = {};
  const service = new LeaveRequestService(
    repository as unknown as LeaveRequestRepository,
    workflowService as LeaveRequestWorkflowService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a recurring leave request with date and time range', async () => {
    const startDate = '2026-06-14T09:00:00.000Z';
    const endDate = '2026-06-14T17:00:00.000Z';
    repository.create.mockResolvedValue({});

    await service.create({
      user: userId.toString(),
      startDate,
      endDate,
      recurrence: LeaveRecurrence.DAILY,
      startTime: '09:00',
      endTime: '17:00',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: new Types.ObjectId(userId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        recurrence: LeaveRecurrence.DAILY,
        startTime: '09:00',
        endTime: '17:00',
      }),
    );
  });

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

  it('validates an updated start date against the existing end date', async () => {
    repository.findRawById.mockResolvedValue({
      _id: leaveId,
      user: userId,
      startDate: new Date('2026-06-14T09:00:00.000Z'),
      endDate: new Date('2026-06-14T17:00:00.000Z'),
      recurrence: LeaveRecurrence.DAILY,
      status: LeaveStatus.PENDING,
    } as LeaveDocument);

    await expect(
      service.update(leaveId.toString(), {
        startDate: '2026-06-15T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.updateById).not.toHaveBeenCalled();
  });
});
