import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { FixedTaskService } from './fixed-task.service';
import { FixedTaskNotificationService } from './fixed-task-notification.service';

describe('FixedTaskService', () => {
  const assigneeId = new Types.ObjectId();
  const creatorId = new Types.ObjectId();
  const templateId = new Types.ObjectId();
  const repository = {
    create: jest.fn(),
    findRawById: jest.fn(),
    updateById: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
  };
  const policy = {
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
    validateParticipants: jest.fn(),
    assertValidTimeRange: jest.fn(),
    parseDate: jest.fn((value: string) => new Date(value)),
    assertValidDateRange: jest.fn(),
  };
  const scoreService = {
    adjustTaskScore: jest.fn(),
    adjustOverdueTasks: jest.fn(),
    getNextDeadline: jest.fn(() => new Date()),
  };
  const notificationService = {
    notifyAssigned: jest.fn(),
    notifyCreatorWhenCompleted: jest.fn(),
  };
  const service = new FixedTaskService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
    scoreService as unknown as FixedTaskScoreService,
    notificationService as unknown as FixedTaskNotificationService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects creating a fixed task with done status', async () => {
    await expect(
      service.create(creatorId.toString(), {
        title: 'Daily report',
        assignedTo: assigneeId.toString(),
        recurrence: FixedTaskRecurrence.DAILY,
        status: FixedTaskStatus.DONE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('stores and validates startDate and endDate when creating', async () => {
    const startDate = '2026-06-14T09:00:00.000Z';
    const endDate = '2026-06-14T17:00:00.000Z';
    repository.create.mockResolvedValue(createTemplate());
    repository.findById.mockResolvedValue(createTemplate());

    await service.create(creatorId.toString(), {
      title: 'Daily report',
      assignedTo: assigneeId.toString(),
      recurrence: FixedTaskRecurrence.DAILY,
      startDate,
      endDate,
    });

    expect(policy.assertValidDateRange).toHaveBeenCalledWith(
      new Date(startDate),
      new Date(endDate),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }),
    );
  });

  it('filters fixed tasks that overlap the requested date range', async () => {
    const startDate = '2026-06-01T00:00:00.000Z';
    const endDate = '2026-06-30T23:59:59.000Z';
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    await service.findAll({
      page: 1,
      limit: 10,
      status: FixedTaskStatus.IN_PROGRESS,
      startDate,
      endDate,
    });

    expect(policy.assertValidDateRange).toHaveBeenCalledWith(
      new Date(startDate),
      new Date(endDate),
    );
    expect(repository.findPaginated).toHaveBeenCalledWith(
      {
        status: FixedTaskStatus.IN_PROGRESS,
        endDate: { $gte: new Date(startDate) },
        startDate: { $lte: new Date(endDate) },
      },
      1,
      10,
    );
  });

  it('scores when the assignee updates status to done', async () => {
    const template = createTemplate();
    const updatedTemplate = {
      ...template,
      status: FixedTaskStatus.DONE,
      doneTime: new Date(),
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    repository.findById.mockResolvedValue(updatedTemplate);

    await service.update(templateId.toString(), assigneeId.toString(), {
      status: FixedTaskStatus.DONE,
    });

    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(updatedTemplate);
    expect(notificationService.notifyCreatorWhenCompleted).toHaveBeenCalledWith(
      creatorId.toString(),
      templateId.toString(),
      updatedTemplate.title,
    );
  });

  it('prevents the assignee from editing fixed task fields', async () => {
    repository.findRawById.mockResolvedValue(createTemplate());

    await expect(
      service.update(templateId.toString(), assigneeId.toString(), {
        title: 'Changed title',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents non-assignees from updating status', async () => {
    repository.findRawById.mockResolvedValue(createTemplate());

    await expect(
      service.update(templateId.toString(), creatorId.toString(), {
        status: FixedTaskStatus.DONE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  function createTemplate(): FixedTaskTemplateDocument {
    return {
      _id: templateId,
      title: 'Daily report',
      assignedTo: assigneeId,
      createdBy: creatorId,
      recurrence: FixedTaskRecurrence.DAILY,
      status: FixedTaskStatus.TODO,
    } as FixedTaskTemplateDocument;
  }
});
