import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { FixedTaskScheduleService } from './fixed-task-schedule.service';
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
    deleteById: jest.fn(),
    createOccurrenceFromUpdate: jest.fn(),
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
  const eventBus = { publishAndWait: jest.fn() };
  const scheduleService = {
    hasScheduleConfig: jest.fn(),
    shouldGenerateToday: jest.fn(),
    buildRolloverSchedule: jest.fn(),
  };
  const service = new FixedTaskUpdateService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
    scoreService as unknown as FixedTaskScoreService,
    notificationService as unknown as FixedTaskNotificationService,
    queryService as unknown as FixedTaskQueryService,
    eventBus as unknown as InternalEventBus,
    scheduleService as unknown as FixedTaskScheduleService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    scheduleService.hasScheduleConfig.mockReturnValue(false);
  });

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
    expect(eventBus.publishAndWait).toHaveBeenCalledWith(
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

  it('does not refresh progress when a fixed task is completed after its deadline', async () => {
    const template = {
      ...createTemplate(),
      endDate: new Date('2000-01-01T00:00:00.000Z'),
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

    expect(eventBus.publishAndWait).not.toHaveBeenCalled();
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

  it('approves timing when approved duration is updated', async () => {
    const template = createTemplate();
    const updatedTemplate = {
      ...template,
      approvedDurationMinutes: 90,
      timingApprovalStatus: FixedTaskTimingApprovalStatus.APPROVED,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    queryService.findById.mockResolvedValue(updatedTemplate);

    await service.update(templateId.toString(), creatorId.toString(), {
      approvedDurationMinutes: 90,
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.objectContaining({
        approvedDurationMinutes: 90,
        timingApprovalStatus: FixedTaskTimingApprovalStatus.APPROVED,
        timingApprovedBy: creatorId,
        timingApprovedAt: expect.any(Date),
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

  it('keeps an active task and recalculates dates when scheduleConfig includes today', async () => {
    const template = createTemplate();
    const startDate = new Date('2026-07-05T20:30:00.000Z');
    const endDate = new Date('2026-07-10T20:30:00.000Z');
    const updatedTemplate = {
      ...template,
      scheduleConfig: { monthDays: [14] },
      startDate,
      endDate,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    queryService.findById.mockResolvedValue(updatedTemplate);
    scheduleService.hasScheduleConfig.mockReturnValue(true);
    scheduleService.shouldGenerateToday.mockReturnValue(true);
    scheduleService.buildRolloverSchedule.mockReturnValue({
      startDate,
      startTime: null,
      endDate,
      endTime: null,
    });

    await service.update(templateId.toString(), creatorId.toString(), {
      scheduleConfig: { monthDays: [14] },
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.objectContaining({
        scheduleConfig: { monthDays: [14] },
        isActive: true,
        startDate,
        endDate,
      }),
    );
  });

  it('deactivates an active task when scheduleConfig does not include today', async () => {
    const template = createTemplate();
    const updatedTemplate = {
      ...template,
      isActive: false,
      scheduleConfig: { monthDays: [14] },
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.updateById.mockResolvedValue(updatedTemplate);
    queryService.findById.mockResolvedValue(updatedTemplate);
    scheduleService.hasScheduleConfig.mockReturnValue(true);
    scheduleService.shouldGenerateToday.mockReturnValue(false);

    await service.update(templateId.toString(), creatorId.toString(), {
      scheduleConfig: { monthDays: [14] },
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      templateId,
      expect.objectContaining({
        scheduleConfig: { monthDays: [14] },
        isActive: false,
      }),
    );
    expect(scheduleService.buildRolloverSchedule).not.toHaveBeenCalled();
  });

  it('creates a new daily occurrence when scheduleConfig is updated to include today', async () => {
    const template = {
      ...createTemplate(),
      scheduleConfig: { weekdays: [1] },
    } as FixedTaskTemplateDocument;
    const startDate = new Date('2026-07-06T20:30:00.000Z');
    const endDate = new Date('2026-07-07T20:30:00.000Z');
    const createdTemplate = {
      ...template,
      _id: new Types.ObjectId(),
      scheduleConfig: { weekdays: [2] },
      startDate,
      endDate,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.createOccurrenceFromUpdate.mockResolvedValue(
      createdTemplate,
    );
    repository.deleteById.mockResolvedValue(template);
    queryService.findById.mockResolvedValue(createdTemplate);
    scheduleService.hasScheduleConfig.mockReturnValue(true);
    scheduleService.shouldGenerateToday
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    scheduleService.buildRolloverSchedule.mockReturnValue({
      startDate,
      startTime: '00:00',
      endDate,
      endTime: '00:00',
    });

    await expect(
      service.update(templateId.toString(), creatorId.toString(), {
        scheduleConfig: { weekdays: [2] },
      }),
    ).resolves.toEqual(createdTemplate);

    expect(repository.createOccurrenceFromUpdate).toHaveBeenCalledWith(
      template,
      expect.objectContaining({
        scheduleConfig: { weekdays: [2] },
        isActive: true,
        startDate,
        endDate,
      }),
      expect.objectContaining({
        startDate,
        endDate,
      }),
    );
    expect(repository.deleteById).toHaveBeenCalledWith(templateId);
    expect(repository.updateById).not.toHaveBeenCalled();
    expect(queryService.findById).toHaveBeenCalledWith(
      createdTemplate._id.toString(),
    );
  });

  it('creates a new daily occurrence when previous scheduleConfig is empty and the update includes today', async () => {
    const template = {
      ...createTemplate(),
      scheduleConfig: {},
    } as FixedTaskTemplateDocument;
    const startDate = new Date('2026-07-06T20:30:00.000Z');
    const endDate = new Date('2026-07-07T20:30:00.000Z');
    const createdTemplate = {
      ...template,
      _id: new Types.ObjectId(),
      scheduleConfig: { weekdays: [3] },
      startDate,
      endDate,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.createOccurrenceFromUpdate.mockResolvedValue(createdTemplate);
    repository.deleteById.mockResolvedValue(template);
    queryService.findById.mockResolvedValue(createdTemplate);
    scheduleService.hasScheduleConfig.mockImplementation(
      (candidate: FixedTaskTemplateDocument) =>
        Boolean(
          candidate.scheduleConfig?.weekdays?.length ||
            candidate.scheduleConfig?.monthDays?.length,
        ),
    );
    scheduleService.shouldGenerateToday
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    scheduleService.buildRolloverSchedule.mockReturnValue({
      startDate,
      startTime: '00:00',
      endDate,
      endTime: '00:00',
    });

    await expect(
      service.update(templateId.toString(), creatorId.toString(), {
        scheduleConfig: { weekdays: [3] },
      }),
    ).resolves.toEqual(createdTemplate);

    expect(repository.createOccurrenceFromUpdate).toHaveBeenCalledWith(
      template,
      expect.objectContaining({
        scheduleConfig: { weekdays: [3] },
        isActive: true,
        startDate,
        endDate,
      }),
      expect.objectContaining({
        startDate,
        endDate,
      }),
    );
    expect(repository.deleteById).toHaveBeenCalledWith(templateId);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('creates a new weekly occurrence and deletes the old active one when scheduleConfig is updated to include today', async () => {
    const template = {
      ...createTemplate(),
      recurrence: FixedTaskRecurrence.WEEKLY,
      scheduleConfig: { weekdays: [1, 4, 5] },
    } as FixedTaskTemplateDocument;
    const startDate = new Date('2026-07-07T20:30:00.000Z');
    const endDate = new Date('2026-07-09T20:30:00.000Z');
    const createdTemplate = {
      ...template,
      _id: new Types.ObjectId(),
      scheduleConfig: { weekdays: [1, 3, 5] },
      startDate,
      endDate,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.createOccurrenceFromUpdate.mockResolvedValue(createdTemplate);
    repository.deleteById.mockResolvedValue(template);
    queryService.findById.mockResolvedValue(createdTemplate);
    scheduleService.hasScheduleConfig.mockReturnValue(true);
    scheduleService.shouldGenerateToday
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    scheduleService.buildRolloverSchedule.mockReturnValue({
      startDate,
      startTime: '00:00',
      endDate,
      endTime: '00:00',
    });

    await expect(
      service.update(templateId.toString(), creatorId.toString(), {
        scheduleConfig: { weekdays: [1, 3, 5] },
      }),
    ).resolves.toEqual(createdTemplate);

    expect(repository.createOccurrenceFromUpdate).toHaveBeenCalledWith(
      template,
      expect.objectContaining({
        scheduleConfig: { weekdays: [1, 3, 5] },
        isActive: true,
        startDate,
        endDate,
      }),
      expect.objectContaining({
        startDate,
        endDate,
      }),
    );
    expect(repository.deleteById).toHaveBeenCalledWith(templateId);
    expect(repository.updateById).not.toHaveBeenCalled();
    expect(queryService.findById).toHaveBeenCalledWith(
      createdTemplate._id.toString(),
    );
  });

  it('creates a new monthly occurrence and deletes the old active one when scheduleConfig is updated to include today', async () => {
    const template = {
      ...createTemplate(),
      recurrence: FixedTaskRecurrence.MONTHLY,
      scheduleConfig: { monthDays: [1, 10] },
    } as FixedTaskTemplateDocument;
    const startDate = new Date('2026-07-06T20:30:00.000Z');
    const endDate = new Date('2026-07-20T20:30:00.000Z');
    const createdTemplate = {
      ...template,
      _id: new Types.ObjectId(),
      scheduleConfig: { monthDays: [15, 20] },
      startDate,
      endDate,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(template);
    repository.createOccurrenceFromUpdate.mockResolvedValue(createdTemplate);
    repository.deleteById.mockResolvedValue(template);
    queryService.findById.mockResolvedValue(createdTemplate);
    scheduleService.hasScheduleConfig.mockReturnValue(true);
    scheduleService.shouldGenerateToday
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    scheduleService.buildRolloverSchedule.mockReturnValue({
      startDate,
      startTime: '00:00',
      endDate,
      endTime: '00:00',
    });

    await expect(
      service.update(templateId.toString(), creatorId.toString(), {
        scheduleConfig: { monthDays: [15, 20] },
      }),
    ).resolves.toEqual(createdTemplate);

    expect(repository.createOccurrenceFromUpdate).toHaveBeenCalledWith(
      template,
      expect.objectContaining({
        scheduleConfig: { monthDays: [15, 20] },
        isActive: true,
        startDate,
        endDate,
      }),
      expect.objectContaining({
        startDate,
        endDate,
      }),
    );
    expect(repository.deleteById).toHaveBeenCalledWith(templateId);
    expect(repository.updateById).not.toHaveBeenCalled();
    expect(queryService.findById).toHaveBeenCalledWith(
      createdTemplate._id.toString(),
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
      isActive: true,
      endDate: new Date('2099-01-01T00:00:00.000Z'),
    } as FixedTaskTemplateDocument;
  }
});
