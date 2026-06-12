import { Types } from 'mongoose';
import { UserService } from '../../user/services/user.service';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskScoreService } from './fixed-task-score.service';

describe('FixedTaskScoreService', () => {
  const repository = {
    claimScoreAdjustment: jest.fn(),
    findUnadjustedIncomplete: jest.fn(),
  };
  const userService = {
    adjustSpecialistScore: jest.fn(),
  };
  const service = new FixedTaskScoreService(
    repository as unknown as FixedTaskRepository,
    userService as unknown as UserService,
  );
  const userId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds 10 for a fixed task completed before endDate and endTime', async () => {
    const task = createTask(FixedTaskStatus.DONE, {
      endDate: new Date(2026, 5, 12),
      endTime: '12:00',
      doneTime: new Date(2026, 5, 12, 11, 0),
    });
    repository.claimScoreAdjustment.mockResolvedValue(task);

    await service.adjustTaskScore(task);

    expect(userService.adjustSpecialistScore).toHaveBeenCalledWith(
      userId.toString(),
      10,
    );
  });

  it('subtracts 10 for an overdue unfinished fixed task', async () => {
    const task = createTask(FixedTaskStatus.TODO, {
      endDate: new Date('2020-01-01T00:00:00.000Z'),
    });
    repository.findUnadjustedIncomplete.mockResolvedValue([task]);
    repository.claimScoreAdjustment.mockResolvedValue(task);

    await service.adjustOverdueTasks();

    expect(userService.adjustSpecialistScore).toHaveBeenCalledWith(
      userId.toString(),
      -10,
    );
  });

  it('does not use nextRunAt for fixed task scoring', async () => {
    const task = createTask(FixedTaskStatus.DONE, {
      nextRunAt: new Date(2026, 5, 12, 9, 0),
      endDate: new Date(2026, 5, 12),
      doneTime: new Date(2026, 5, 12, 17, 0),
      endTime: '18:00',
    });
    repository.claimScoreAdjustment.mockResolvedValue(task);

    await service.adjustTaskScore(task);

    expect(userService.adjustSpecialistScore).toHaveBeenCalledWith(
      userId.toString(),
      10,
    );
  });

  it('creates a daily deadline using the scheduled endTime', () => {
    const now = new Date(2026, 5, 12, 10, 0);

    const deadline = service.getNextDeadline(
      FixedTaskRecurrence.DAILY,
      '14:30',
      now,
    );

    expect(deadline).toEqual(new Date(2026, 5, 12, 14, 30));
  });

  function createTask(
    status: FixedTaskStatus,
    dates: {
      nextRunAt?: Date;
      endDate?: Date;
      doneTime?: Date;
      endTime?: string;
    },
  ): FixedTaskTemplateDocument {
    return {
      _id: new Types.ObjectId(),
      assignedTo: userId,
      recurrence: FixedTaskRecurrence.DAILY,
      status,
      ...dates,
    } as FixedTaskTemplateDocument;
  }
});
