import { Types } from 'mongoose';
import { LeaveRecurrence } from '../LeaveRequest.schema';
import { LeaveRequestRepository } from '../repositories/leave-request.repository';
import { LeaveRequestCreationService } from './leave-request-creation.service';
import { LeaveRequestPolicyService } from './leave-request-policy.service';

describe('LeaveRequestCreationService', () => {
  const userId = new Types.ObjectId();
  const repository = { create: jest.fn() };
  const policy = {
    toObjectId: jest.fn(() => userId),
    parseDate: jest.fn((value: string) => new Date(value)),
    assertValidDateRange: jest.fn(),
    assertHourlyLeaveTimes: jest.fn(),
    assertValidTimeRange: jest.fn(),
  };
  const service = new LeaveRequestCreationService(
    repository as unknown as LeaveRequestRepository,
    policy as unknown as LeaveRequestPolicyService,
  );

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
        user: userId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        recurrence: LeaveRecurrence.DAILY,
        startTime: '09:00',
        endTime: '17:00',
      }),
    );
  });

  it('validates hourly leave time fields before creation', async () => {
    const startDate = '2026-06-14T09:00:00.000Z';
    const endDate = '2026-06-14T17:00:00.000Z';
    repository.create.mockResolvedValue({});

    await service.create({
      user: userId.toString(),
      startDate,
      endDate,
      recurrence: LeaveRecurrence.HOURLY,
      startTime: '09:00',
      endTime: '11:00',
    });

    expect(policy.assertHourlyLeaveTimes).toHaveBeenCalledWith(
      LeaveRecurrence.HOURLY,
      '09:00',
      '11:00',
    );
  });
});
