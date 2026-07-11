import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';
import { FixedTaskCreationService } from './fixed-task-creation.service';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';

describe('FixedTaskCreationService', () => {
  const assigneeId = new Types.ObjectId().toString();
  const creatorId = new Types.ObjectId().toString();
  const repository = { create: jest.fn() };
  const policy = {
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
    validateParticipants: jest.fn(),
    parseDate: jest.fn((value: string) => new Date(value)),
    assertValidDateRange: jest.fn(),
  };
  const deadlineService = { getNextDeadline: jest.fn(() => new Date()) };
  const notificationService = { notifyAssigned: jest.fn() };
  const queryService = { findById: jest.fn() };
  const service = new FixedTaskCreationService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
    deadlineService as unknown as FixedTaskDeadlineService,
    notificationService as unknown as FixedTaskNotificationService,
    queryService as unknown as FixedTaskQueryService,
  );

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => jest.useRealTimers());

  it('rejects creating a fixed task with done status', async () => {
    await expect(
      service.create(creatorId, {
        title: 'Daily report',
        assignedTo: assigneeId,
        recurrence: FixedTaskRecurrence.DAILY,
        status: FixedTaskStatus.DONE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows equal start and end times across different dates', async () => {
    const startDate = '2026-06-15T12:47:28.468Z';
    const endDate = '2026-06-16T12:47:30.501Z';
    queryService.findById.mockResolvedValue({});

    await service.create(creatorId, {
      title: 'Weekly task',
      assignedTo: assigneeId,
      recurrence: FixedTaskRecurrence.WEEKLY,
      approvedDurationMinutes: 225,
      startDate,
      endDate,
      startTime: '16:17',
      endTime: '16:17',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: '16:17',
        endTime: '16:17',
        approvedDurationMinutes: 225,
        timingApprovalStatus: FixedTaskTimingApprovalStatus.APPROVED,
        timingApprovedBy: new Types.ObjectId(creatorId),
        timingApprovedAt: expect.any(Date),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }),
    );
  });

  it('activates a fixed task when its start date is today in Tehran', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-11T20:30:00.000Z'));
    queryService.findById.mockResolvedValue({});

    await service.create(creatorId, {
      title: 'Today task',
      assignedTo: assigneeId,
      recurrence: FixedTaskRecurrence.DAILY,
      startDate: '2026-07-12T14:30:00.000Z',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });

  it('deactivates a fixed task whose start date is not today in Tehran', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-11T20:30:00.000Z'));
    queryService.findById.mockResolvedValue({});

    await service.create(creatorId, {
      title: 'Future task',
      assignedTo: assigneeId,
      recurrence: FixedTaskRecurrence.DAILY,
      startDate: '2026-07-12T20:30:00.000Z',
      isActive: true,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });
});
