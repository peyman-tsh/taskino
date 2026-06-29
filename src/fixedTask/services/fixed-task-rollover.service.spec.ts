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
import { HolidayService } from '../../holiday/services/holiday.service';

describe('FixedTaskRolloverService', () => {
  const repository = {
    findActiveRolloverCandidates: jest.fn(),
    findDailyRolloverCandidates: jest.fn(),
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
  const holidayService = {
    isNonWorkingDay: jest.fn(),
  };
  const service = new FixedTaskRolloverService(
    repository as unknown as FixedTaskRepository,
    scoreService as unknown as FixedTaskScoreService,
    eventBus as unknown as InternalEventBus,
    holidayService as unknown as HolidayService,
  );
  const now = new Date('2026-06-19T11:05:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    holidayService.isNonWorkingDay.mockResolvedValue(false);
  });

  it('runs daily rollover through the daily scheduled handler', async () => {
    repository.findDailyRolloverCandidates.mockResolvedValue([]);

    await service.handleDailyRollover();

    expect(repository.findDailyRolloverCandidates).toHaveBeenCalled();
  });

  it('skips daily rollover on non-working days', async () => {
    holidayService.isNonWorkingDay.mockResolvedValue(true);

    await service.handleDailyRollover();

    expect(repository.findActiveRolloverCandidates).not.toHaveBeenCalled();
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
    repository.findDailyRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({ _id: new Types.ObjectId() });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, now),
    ).resolves.toBe(1);

    expect(repository.findDailyRolloverCandidates).toHaveBeenCalled();

    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      now,
    );
    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(task);
    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: now,
      startTime: '14:35',
      endDate: new Date('2026-06-19T20:30:00.000Z'),
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
    repository.findDailyRolloverCandidates.mockResolvedValue([task]);
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

  it('deactivates scheduled daily work on unscheduled weekdays without creating a new occurrence', async () => {
    const task = createTask(FixedTaskRecurrence.DAILY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 0, 1] };
    repository.findDailyRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, now),
    ).resolves.toBe(0);

    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(task);
    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      now,
    );
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
  });

  it('creates scheduled daily work from the latest inactive occurrence', async () => {
    const sunday = new Date('2026-06-21T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.DAILY, FixedTaskStatus.TODO);
    task.isActive = false;
    task.scheduleConfig = { weekdays: [0] };
    repository.findDailyRolloverCandidates.mockResolvedValue([task]);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, sunday),
    ).resolves.toBe(1);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: sunday,
      startTime: '14:35',
      endDate: new Date('2026-06-21T20:30:00.000Z'),
      endTime: '00:01',
    });
  });

  it('sets configured daily endDate to the end of the current continuous weekday block', async () => {
    const saturday = new Date('2026-06-20T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.DAILY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 0, 1, 3, 4, 5] };
    repository.findDailyRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, saturday),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: saturday,
      startTime: '14:35',
      endDate: new Date('2026-06-22T20:30:00.000Z'),
      endTime: '00:01',
    });
  });

  it('does not recreate a configured daily task while its current weekday block is still open', async () => {
    const sunday = new Date('2026-06-21T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.DAILY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 0, 1, 3, 4, 5] };
    task.startDate = new Date('2026-06-20T11:05:00.000Z');
    task.endDate = new Date('2026-06-22T20:30:00.000Z');
    repository.findDailyRolloverCandidates.mockResolvedValue([task]);

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, sunday),
    ).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
  });

  it('does not let one unscheduled daily row block other daily rows without scheduleConfig', async () => {
    const monday = new Date('2026-06-22T11:05:00.000Z');
    const scheduledTask = createTask(
      FixedTaskRecurrence.DAILY,
      FixedTaskStatus.TODO,
    );
    const defaultTask = createTask(
      FixedTaskRecurrence.DAILY,
      FixedTaskStatus.TODO,
    );

    scheduledTask.title = defaultTask.title;
    scheduledTask.description = defaultTask.description;
    scheduledTask.assignedTo = defaultTask.assignedTo;
    scheduledTask.createdBy = defaultTask.createdBy;
    scheduledTask.sourceExcel = defaultTask.sourceExcel = 'fixed.xlsx';
    scheduledTask.sourceSheet = defaultTask.sourceSheet = 'Sheet 1';
    scheduledTask.sourceRow = 10;
    defaultTask.sourceRow = 11;
    scheduledTask.scheduleConfig = { weekdays: [0, 2, 4, 6] };

    repository.findDailyRolloverCandidates.mockResolvedValue([
      scheduledTask,
      defaultTask,
    ]);
    repository.claimExpiredOccurrence.mockResolvedValue(defaultTask);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, monday),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(
      defaultTask,
      expect.any(Object),
    );
  });

  it('rolls over unfinished work regardless of its deadline', async () => {
    const task = createTask(
      FixedTaskRecurrence.WEEKLY,
      FixedTaskStatus.IN_PROGRESS,
    );
    task.scheduleConfig = { weekdays: [5] };
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

  it('skips weekly work on unscheduled weekdays', async () => {
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6] };
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, now),
    ).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
  });

  it('uses the old weekly schedule when scheduleConfig is empty', async () => {
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, now),
    ).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
  });

  it('rolls over weekly work on Saturday when scheduleConfig is empty', async () => {
    const saturday = new Date('2026-06-20T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, saturday),
    ).resolves.toBe(1);

    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      saturday,
    );
  });

  it('sets configured weekly endDate to the next configured weekday', async () => {
    const saturday = new Date('2026-06-20T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 1, 3] };
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, saturday),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: saturday,
      startTime: '14:35',
      endDate: new Date('2026-06-21T20:30:00.000Z'),
      endTime: '00:01',
    });
  });

  it('uses the following configured weekday for weekly windows', async () => {
    const monday = new Date('2026-06-22T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 1, 3] };
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, monday),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: monday,
      startTime: '14:35',
      endDate: new Date('2026-06-23T20:30:00.000Z'),
      endTime: '00:01',
    });
  });

  it('uses the old monthly schedule when scheduleConfig is empty', async () => {
    const firstDayOfMonth = new Date('2026-07-01T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, firstDayOfMonth),
    ).resolves.toBe(1);

    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      firstDayOfMonth,
    );
  });

  it('sets configured monthly endDate to the next configured month day', async () => {
    const firstDayOfMonth = new Date('2026-07-01T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { monthDays: [1, 5, 27, 28] };
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, firstDayOfMonth),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: firstDayOfMonth,
      startTime: '14:35',
      endDate: new Date('2026-07-04T20:30:00.000Z'),
      endTime: '00:01',
    });
  });

  it('uses the following configured month day for monthly windows', async () => {
    const dayTwentySeven = new Date('2026-07-27T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { monthDays: [1, 5, 27, 28] };
    repository.findActiveRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, dayTwentySeven),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: dayTwentySeven,
      startTime: '14:35',
      endDate: new Date('2026-07-27T20:30:00.000Z'),
      endTime: '00:01',
    });
  });

  it('reactivates the old occurrence when creating the next one fails', async () => {
    const task = createTask(
      FixedTaskRecurrence.MONTHLY,
      FixedTaskStatus.DONE,
    );
    task.scheduleConfig = { monthDays: [19] };
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
