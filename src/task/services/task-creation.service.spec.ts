import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { ExcelService } from '../../excel/services/excel.service';
import { TaskRepository } from '../repositories/task.repository';
import { TaskDocument, TaskStatus } from '../task.schema';
import { TaskCreationService } from './task-creation.service';
import { TaskNotificationService } from './task-notification.service';
import { TaskPolicyService } from './task-policy.service';
import { TaskScoreService } from './task-score.service';

describe('TaskCreationService', () => {
  const specialistId = new Types.ObjectId().toString();
  const repository = { create: jest.fn() };
  const excelService = { uploadFile: jest.fn() };
  const policy = {
    validateObjectId: jest.fn(),
    assertSpecialist: jest.fn(),
    normalizeAssignedTo: jest.fn((value: string | string[] | undefined) =>
      Array.isArray(value) ? value : value ? [value] : [],
    ),
    assertSingleAssignee: jest.fn(),
    assertValidAssigneeIds: jest.fn(),
    assertParticipants: jest.fn(),
    parseDateTime: jest.fn(),
    assertValidDeadline: jest.fn(),
    assertValidTimeRange: jest.fn(),
  };
  const notificationService = { notifyAssignedUsers: jest.fn() };
  const scoreService = { adjustCompletedTaskScore: jest.fn() };
  const service = new TaskCreationService(
    repository as unknown as TaskRepository,
    excelService as unknown as ExcelService,
    policy as unknown as TaskPolicyService,
    notificationService as unknown as TaskNotificationService,
    scoreService as unknown as TaskScoreService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an extra task only for the current specialist without Excel', async () => {
    const task = {
      _id: new Types.ObjectId(),
      title: 'Extra task',
      status: TaskStatus.TODO,
    } as TaskDocument;
    repository.create.mockResolvedValue(task);

    await service.createExtraTask({ title: 'Extra task' }, specialistId);

    expect(policy.assertSpecialist).toHaveBeenCalledWith(specialistId);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: new Types.ObjectId(specialistId),
        assignedTo: [new Types.ObjectId(specialistId)],
        status: TaskStatus.TODO,
        isExtraTask: true,
      }),
    );
    expect(excelService.uploadFile).not.toHaveBeenCalled();
  });

  it('assigns a regular task to its creator when assignedTo is omitted', async () => {
    const task = {
      _id: new Types.ObjectId(),
      title: 'Self assigned task',
      status: TaskStatus.TODO,
    } as TaskDocument;
    repository.create.mockResolvedValue(task);

    await service.create({
      title: 'Self assigned task',
      createdBy: specialistId,
    });

    expect(policy.normalizeAssignedTo).toHaveBeenCalledWith(specialistId);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: new Types.ObjectId(specialistId),
        assignedTo: [new Types.ObjectId(specialistId)],
      }),
    );
  });
});
