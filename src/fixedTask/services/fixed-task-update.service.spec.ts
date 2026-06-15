import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { FixedTaskUpdateService } from './fixed-task-update.service';

describe('FixedTaskUpdateService', () => {
  const assigneeId = new Types.ObjectId();
  const creatorId = new Types.ObjectId();
  const templateId = new Types.ObjectId();
  const repository = {
    findRawById: jest.fn(),
    updateById: jest.fn(),
  };
  const policy = {
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
    validateParticipants: jest.fn(),
    parseDate: jest.fn((value: string) => new Date(value)),
    assertValidDateRange: jest.fn(),
  };
  const scoreService = { adjustTaskScore: jest.fn() };
  const notificationService = { notifyCreatorWhenCompleted: jest.fn() };
  const queryService = { findById: jest.fn() };
  const service = new FixedTaskUpdateService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
    scoreService as unknown as FixedTaskScoreService,
    notificationService as unknown as FixedTaskNotificationService,
    queryService as unknown as FixedTaskQueryService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('scores when the assignee updates status to done', async () => {
    const template = createTemplate();
    const updatedTemplate = {
      ...template,
      status: FixedTaskStatus.DONE,
      doneTime: new Date(),
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    queryService.findById.mockResolvedValue(updatedTemplate);

    await service.update(templateId.toString(), assigneeId.toString(), {
      status: FixedTaskStatus.DONE,
    });

    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(updatedTemplate);
    expect(notificationService.notifyCreatorWhenCompleted).toHaveBeenCalled();
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
