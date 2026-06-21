import { Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskRolloverService } from './fixed-task-rollover.service';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import { UserProgressEvents } from '../../common/events/user-progress.events';

describe('FixedTaskRolloverService', () => {
  const repository = {
    findActiveRolloverCandidates: jest.fn(),
    claimExpiredOccurrence: jest.fn(),
    createNextOccurrence: jest.fn(),
    reactivateOccurrence: jest.fn(),
  };
  const scoreService = {
    adjustTaskScore: jest.fn(),
  };
  const eventBus = {
    publish: jest.fn(),
  };
  const service = new FixedTaskRolloverService(
    repository as unknown as FixedTaskRepository,
    scoreService as unknown as FixedTaskScoreService,
    eventBus as unknown as InternalEventBus,
  );
  const now = new Date(2026, 5, 19, 14, 35);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs daily rollover through the daily scheduled handler', async () => {
    repository.findActiveRolloverCandidates.mockResolvedValue([]);

    await service.handleDailyRollover();

    expect(repository.findActiveRolloverCandidates).toHaveBeenCalledWith(
      FixedTaskRecurrence.DAILY,
    );
  });

  it('runs weekly rollover through the weekly scheduled handler', async () => {
    repository.findActiveRolloverCandidates.mockResolvedValue([]);

    await service.handleWeeklyRollover();

    expect(repository.findActiveRolloverCandidates).toHaveBeenCalledWith(
      FixedTaskRecurrence.WEEKLY,
    );
  });

  it('runs monthly rollover through the monthly scheduled handler', async () => {
    repository.findActiveRolloverCandidates.mockResolvedValue([]);

    await service.handleMonthlyRollover();

    expect(repository.findActiveRolloverCandidates).toHaveBeenCalledWith(
      FixedTaskRecurrence.MONTHLY,
    );
  });

  it('deactivates an expired occurrence and creates the next active one', async () => {
    const task = createTask(
      FixedTaskRecurrence.DAILY,
      FixedTaskStatus.IN_PROGRESS,
    );
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, now),
    ).resolves.toBe(1);

    expect(repository.findActiveRolloverCandidates).toHaveBeenCalledWith(
      FixedTaskRecurrence.DAILY,
    );

    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      now,
    );
    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(task);
    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: now,
      startTime: '14:35',
      endDate: new Date(2026, 5, 20, 0, 0, 0, 0),
      endTime: '00:01',
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      UserProgressEvents.REFRESH_REQUESTED,
      expect.objectContaining({
        userIds: [task.assignedTo.toString()],
      }),
    );
  });

  it('rolls over a completed occurrence regardless of its deadline', async () => {
    const task = createTask(FixedTaskRecurrence.DAILY, FixedTaskStatus.DONE);
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, now),
    ).resolves.toBe(1);

    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(task);
    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      now,
    );
    expect(repository.createNextOccurrence).toHaveBeenCalled();
  });

  it('rolls over unfinished work regardless of its deadline', async () => {
    const task = createTask(
      FixedTaskRecurrence.WEEKLY,
      FixedTaskStatus.IN_PROGRESS,
    );
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, now),
    ).resolves.toBe(1);

    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(task);
    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      now,
    );
    expect(repository.createNextOccurrence).toHaveBeenCalled();
  });

  it('reactivates the old occurrence when creating the next one fails', async () => {
    const task = createTask(
      FixedTaskRecurrence.MONTHLY,
      FixedTaskStatus.DONE,
    );
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockRejectedValue(new Error('create failed'));

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, now),
    ).resolves.toBe(0);

    expect(repository.reactivateOccurrence).toHaveBeenCalledWith(task._id);
  });

  function createTask(
    recurrence: FixedTaskRecurrence,
    status: FixedTaskStatus,
  ): FixedTaskTemplateDocument {
    return {
      _id: new Types.ObjectId(),
      title: 'Recurring report',
      assignedTo: new Types.ObjectId(),
      createdBy: new Types.ObjectId(),
      recurrence,
      description: 'Description',
      status,
      isActive: true,
      endDate: new Date(2026, 5, 19),
      endTime: '00:01',
    } as FixedTaskTemplateDocument;
  }
});
