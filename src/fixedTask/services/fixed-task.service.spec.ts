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
  };
  const policy = {
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
    validateParticipants: jest.fn(),
    assertValidTimeRange: jest.fn(),
  };
  const scoreService = {
    adjustTaskScore: jest.fn(),
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
