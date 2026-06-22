import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskTimingService } from './fixed-task-timing.service';

describe('FixedTaskTimingService', () => {
  const assigneeId = new Types.ObjectId();
  const managerId = new Types.ObjectId();
  const taskId = new Types.ObjectId();
  const repository = {
    findRawById: jest.fn(),
    updateById: jest.fn(),
  };
  const policy = {
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
  };
  const queryService = {
    findById: jest.fn(),
  };
  const service = new FixedTaskTimingService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
    queryService as unknown as FixedTaskQueryService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('starts the timer for the active assignee', async () => {
    repository.findRawById.mockResolvedValue({
      _id: taskId,
      assignedTo: assigneeId,
      isActive: true,
      status: FixedTaskStatus.TODO,
      startedAt: null,
    });
    repository.updateById.mockResolvedValue({});
    queryService.findById.mockResolvedValue({});

    await service.startTimer(taskId.toString(), assigneeId.toString());

    expect(repository.updateById).toHaveBeenCalledWith(
      taskId,
      expect.objectContaining({
        status: FixedTaskStatus.IN_PROGRESS,
        startedAt: expect.any(Date),
        timingApprovalStatus: FixedTaskTimingApprovalStatus.PENDING,
      }),
    );
  });

  it('prevents a non-assignee from starting the timer', async () => {
    repository.findRawById.mockResolvedValue({
      _id: taskId,
      assignedTo: assigneeId,
      isActive: true,
      status: FixedTaskStatus.TODO,
    });

    await expect(
      service.startTimer(taskId.toString(), managerId.toString()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approves actual duration as the standard duration', async () => {
    repository.findRawById.mockResolvedValue({
      _id: taskId,
      status: FixedTaskStatus.DONE,
      actualDurationMinutes: 225,
      startedAt: new Date('2026-06-22T04:30:00.000Z'),
      doneTime: new Date('2026-06-22T08:15:00.000Z'),
    });
    repository.updateById.mockResolvedValue({});
    queryService.findById.mockResolvedValue({});

    await service.reviewTiming(
      taskId.toString(),
      managerId.toString(),
      FixedTaskTimingApprovalStatus.APPROVED,
      undefined,
      'Timing approved by manager',
    );

    expect(repository.updateById).toHaveBeenCalledWith(
      taskId,
      expect.objectContaining({
        timingApprovalStatus: FixedTaskTimingApprovalStatus.APPROVED,
        approvedDurationMinutes: 225,
        startTime: '08:00',
        endTime: '11:45',
        taskComment: 'Timing approved by manager',
        timingApprovedBy: managerId,
        timingApprovedAt: expect.any(Date),
      }),
    );
  });

  it('rejects review when actual duration is missing', async () => {
    repository.findRawById.mockResolvedValue({
      _id: taskId,
      status: FixedTaskStatus.DONE,
      actualDurationMinutes: null,
      startedAt: new Date(),
      doneTime: new Date(),
    });

    await expect(
      service.reviewTiming(
        taskId.toString(),
        managerId.toString(),
        FixedTaskTimingApprovalStatus.REJECTED,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
