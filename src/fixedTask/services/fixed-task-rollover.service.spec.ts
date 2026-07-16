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
import { FixedTaskScheduleService } from './fixed-task-schedule.service';

describe('FixedTaskRolloverService', () => {
  const repository = {
    findActiveRolloverCandidates: jest.fn(),
    findDailyRolloverCandidates: jest.fn(),
    findConfiguredRolloverCandidates: jest.fn(),
    claimExpiredOccurrence: jest.fn(),
    createNextOccurrence: jest.fn(),
    reactivateOccurrence: jest.fn(),
    activateOccurrence: jest.fn(),
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
  const scheduleService = new FixedTaskScheduleService();
  const service = new FixedTaskRolloverService(
    repository as unknown as FixedTaskRepository,
    scoreService as unknown as FixedTaskScoreService,
    eventBus as unknown as InternalEventBus,
    holidayService as unknown as HolidayService,
    scheduleService,
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
    repository.findConfiguredRolloverCandidates.mockResolvedValue([]);

    await service.handleWeeklyRollover();

    expect(repository.findConfiguredRolloverCandidates).toHaveBeenCalledWith(
      FixedTaskRecurrence.WEEKLY,
    );
  });

  it('runs monthly rollover through the monthly scheduled handler', async () => {
    repository.findConfiguredRolloverCandidates.mockResolvedValue([]);

    await service.handleMonthlyRollover();

    expect(repository.findConfiguredRolloverCandidates).toHaveBeenCalledWith(
      FixedTaskRecurrence.MONTHLY,
    );
  });

  it('deactivates an expired occurrence and creates the next active one', async () => {
    const task = createTask(
      FixedTaskRecurrence.DAILY,
      FixedTaskStatus.IN_PROGRESS,
    );
    task.scheduleConfig = { weekdays: [5] };
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
      startDate: new Date('2026-06-18T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-06-19T20:30:00.000Z'),
      endTime: '00:00',
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
    task.scheduleConfig = { weekdays: [5] };
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
      startDate: new Date('2026-06-20T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-06-21T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('activates an existing occurrence that starts on the scheduled day without creating a duplicate', async () => {
    const sunday = new Date('2026-06-21T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    task.isActive = false;
    task.startDate = new Date('2026-06-20T20:30:00.000Z');
    task.scheduleConfig = { weekdays: [0] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.activateOccurrence.mockResolvedValue({ modifiedCount: 1 });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, sunday),
    ).resolves.toBe(0);

    expect(repository.activateOccurrence).toHaveBeenCalledWith(task._id);
    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
  });

  it('creates configured daily work for the current scheduled day', async () => {
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
      startDate: new Date('2026-06-19T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-06-20T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('creates configured daily work on each scheduled day', async () => {
    const sunday = new Date('2026-06-21T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.DAILY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 0, 1, 3, 4, 5] };
    task.startDate = new Date('2026-06-20T11:05:00.000Z');
    task.endDate = new Date('2026-06-22T20:30:00.000Z');
    repository.findDailyRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, sunday),
    ).resolves.toBe(1);

    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      sunday,
    );
    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: new Date('2026-06-20T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-06-21T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('skips daily rows without scheduleConfig while processing configured rows', async () => {
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
    scheduledTask.scheduleConfig = { weekdays: [1] };

    repository.findDailyRolloverCandidates.mockResolvedValue([
      scheduledTask,
      defaultTask,
    ]);
    repository.claimExpiredOccurrence.mockResolvedValue(scheduledTask);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.DAILY, monday),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(
      scheduledTask,
      expect.any(Object),
    );
    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      scheduledTask._id,
      monday,
    );
    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalledWith(
      defaultTask._id,
      monday,
    );
  });

  it('rolls over unfinished work regardless of its deadline', async () => {
    const task = createTask(
      FixedTaskRecurrence.WEEKLY,
      FixedTaskStatus.IN_PROGRESS,
    );
    task.scheduleConfig = { weekdays: [5] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
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
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, now),
    ).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
  });

  it('deactivates expired unfinished configured monthly work on unscheduled days', async () => {
    const daySixteen = new Date('2026-07-07T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { monthDays: [13, 14, 15] };
    task.endDate = new Date('2026-07-06T20:30:00.000Z');
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, daySixteen),
    ).resolves.toBe(0);

    expect(scoreService.adjustTaskScore).toHaveBeenCalledWith(task);
    expect(repository.claimExpiredOccurrence).toHaveBeenCalledWith(
      task._id,
      daySixteen,
    );
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
  });

  it('skips weekly work when scheduleConfig is empty', async () => {
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, now),
    ).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
  });

  it('keeps active weekly work active on Saturday when scheduleConfig is empty', async () => {
    const saturday = new Date('2026-06-20T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, saturday),
    ).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
    expect(scoreService.adjustTaskScore).not.toHaveBeenCalled();
  });

  it('sets configured weekly work to end at the following midnight', async () => {
    const saturday = new Date('2026-06-20T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 1, 3] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, saturday),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: new Date('2026-06-19T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-06-20T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('gives every configured weekly occurrence a one-day window', async () => {
    const monday = new Date('2026-06-22T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.WEEKLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { weekdays: [6, 1, 3] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.WEEKLY, monday),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: new Date('2026-06-21T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-06-22T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('skips monthly work when scheduleConfig is empty', async () => {
    const firstDayOfMonth = new Date('2026-06-22T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, firstDayOfMonth),
    ).resolves.toBe(0);

    expect(repository.claimExpiredOccurrence).not.toHaveBeenCalled();
    expect(repository.createNextOccurrence).not.toHaveBeenCalled();
    expect(scoreService.adjustTaskScore).not.toHaveBeenCalled();
  });

  it('sets configured monthly work to end at the following midnight', async () => {
    const firstDayOfMonth = new Date('2026-06-22T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { monthDays: [1, 5, 27, 28] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, firstDayOfMonth),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: new Date('2026-06-21T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-06-22T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('gives every configured monthly occurrence a one-day window', async () => {
    const dayTwentySeven = new Date('2026-07-18T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { monthDays: [1, 5, 27, 28] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, dayTwentySeven),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: new Date('2026-07-17T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-07-18T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('ends monthly work the day after its scheduled date regardless of the next run', async () => {
    const dayFifteen = new Date('2026-07-06T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { monthDays: [2, 15] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, dayFifteen),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: new Date('2026-07-05T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-07-06T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('ends single-day configured monthly work the following day', async () => {
    const dayFifteen = new Date('2026-07-06T11:05:00.000Z');
    const task = createTask(FixedTaskRecurrence.MONTHLY, FixedTaskStatus.TODO);
    task.scheduleConfig = { monthDays: [15] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
    repository.claimExpiredOccurrence.mockResolvedValue(task);
    repository.createNextOccurrence.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(
      service.runForRecurrence(FixedTaskRecurrence.MONTHLY, dayFifteen),
    ).resolves.toBe(1);

    expect(repository.createNextOccurrence).toHaveBeenCalledWith(task, {
      startDate: new Date('2026-07-05T20:30:00.000Z'),
      startTime: '00:00',
      endDate: new Date('2026-07-06T20:30:00.000Z'),
      endTime: '00:00',
    });
  });

  it('reactivates the old occurrence when creating the next one fails', async () => {
    const task = createTask(
      FixedTaskRecurrence.MONTHLY,
      FixedTaskStatus.DONE,
    );
    task.scheduleConfig = { monthDays: [29] };
    repository.findConfiguredRolloverCandidates.mockResolvedValue([task]);
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
