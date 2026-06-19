import { Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';
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
  const deadlineService = {
    getScoreDeadline: jest.fn(),
  };
  const scoreService = {
    adjustTaskScore: jest.fn(),
  };
  const eventBus = {
    publish: jest.fn(),
  };
  const service = new FixedTaskRolloverService(
    repository as unknown as FixedTaskRepository,
    deadlineService as unknown as FixedTaskDeadlineService,
    scoreService as unknown as FixedTaskScoreService,
    eventBus as unknown as InternalEventBus,
  );
  const now = new Date(2026, 5, 19, 14, 35);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs rollover through the scheduled handler', async () => {
    repository.findActiveRolloverCandidates.mockResolvedValue([]);

    await service.handleRollover();

    expect(repository.findActiveRolloverCandidates).toHaveBeenCalledWith(
      expect.any(Date),
    );
  });

  it('deactivates an expired occurrence and creates the next active one', async () => {
    const task = createTask(
      FixedTaskRecurrence.DAILY,
      FixedTaskStatus.IN_PROGRESS,
    );
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    deadlineService.getScoreDeadline.mockReturnValue(
      new Date(2026, 5, 19, 14, 34),
    );
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(service.runOnce(now)).resolves.toBe(1);

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

  it('rolls over a completed occurrence before its deadline', async () => {
    const task = createTask(FixedTaskRecurrence.DAILY, FixedTaskStatus.DONE);
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    deadlineService.getScoreDeadline.mockReturnValue(
      new Date(2026, 5, 20, 0, 1),
    );
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(service.runOnce(now)).resolves.toBe(1);

    expect(deadlineService.getScoreDeadline).not.toHaveBeenCalled();
    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(task);
    expect(repository.createNextOccurrence).toHaveBeenCalled();
  });

  it('does not roll over before endDate and endTime expire', async () => {
    const task = createTask(
      FixedTaskRecurrence.WEEKLY,
      FixedTaskStatus.IN_PROGRESS,
    );
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    deadlineService.getScoreDeadline.mockReturnValue(
      new Date(2026, 5, 19, 14, 36),
    );

    await expect(service.runOnce(now)).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
    expect(scoreService.adjustTaskScore).not.toHaveBeenCalled();
  });

  it('reactivates the old occurrence when creating the next one fails', async () => {
    const task = createTask(
      FixedTaskRecurrence.MONTHLY,
      FixedTaskStatus.DONE,
    );
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    deadlineService.getScoreDeadline.mockReturnValue(
      new Date(2026, 5, 19, 14, 34),
    );
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockRejectedValue(new Error('create failed'));

    await expect(service.runOnce(now)).resolves.toBe(0);

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
