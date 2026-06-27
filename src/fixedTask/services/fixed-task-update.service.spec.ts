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
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import { UserProgressEvents } from '../../common/events/user-progress.events';

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
  const eventBus = { publish: jest.fn() };
  const service = new FixedTaskUpdateService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
    scoreService as unknown as FixedTaskScoreService,
    notificationService as unknown as FixedTaskNotificationService,
    queryService as unknown as FixedTaskQueryService,
    eventBus as unknown as InternalEventBus,
  );

  beforeEach(() => jest.clearAllMocks());

  it('scores when the assignee updates status to done', async () => {
    const template = {
      ...createTemplate(),
      startedAt: new Date(Date.now() - 225 * 60_000),
    } as FixedTaskTemplateDocument;
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
    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.objectContaining({
        actualDurationMinutes: expect.any(Number),
      }),
    );
    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.not.objectContaining({
        approvedDurationMinutes: expect.anything(),
        timingApprovalStatus: expect.anything(),
        timingApprovedBy: expect.anything(),
        timingApprovedAt: expect.anything(),
      }),
    );
    expect(notificationService.notifyCreatorWhenCompleted).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(
      UserProgressEvents.REFRESH_REQUESTED,
      expect.objectContaining({
        userIds: [assigneeId.toString()],
      }),
    );
  });

  it('uses provided actual duration when assignee completes a fixed task', async () => {
    const template = {
      ...createTemplate(),
      startedAt: new Date(Date.now() - 225 * 60_000),
    } as FixedTaskTemplateDocument;
    const updatedTemplate = {
      ...template,
      status: FixedTaskStatus.DONE,
      actualDurationMinutes: 180,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    queryService.findById.mockResolvedValue(updatedTemplate);

    await service.update(templateId.toString(), assigneeId.toString(), {
      status: FixedTaskStatus.DONE,
      actualDurationMinutes: 180,
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.objectContaining({
        actualDurationMinutes: 180,
      }),
    );
  });

  it('allows the assignee to update only actual duration', async () => {
    const template = createTemplate();
    const updatedTemplate = {
      ...template,
      actualDurationMinutes: 120,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    queryService.findById.mockResolvedValue(updatedTemplate);

    await service.update(templateId.toString(), assigneeId.toString(), {
      actualDurationMinutes: 120,
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.objectContaining({
        actualDurationMinutes: 120,
      }),
    );
  });

  it('allows the assignee to update fixed task DTO fields', async () => {
    const template = createTemplate();
    const updatedTemplate = {
      ...template,
      title: 'Changed title',
      isActive: true,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    queryService.findById.mockResolvedValue(updatedTemplate);

    await service.update(templateId.toString(), assigneeId.toString(), {
      title: 'Changed title',
      isActive: true,
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.objectContaining({
        title: 'Changed title',
        isActive: true,
      }),
    );
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
