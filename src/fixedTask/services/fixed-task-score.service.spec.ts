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
    findUnadjustedWithDeadline: jest.fn(),
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

  it('adds 10 for a fixed task completed before nextRunAt', async () => {
    const task = createTask(FixedTaskStatus.DONE, {
      nextRunAt: new Date('2026-06-12T12:00:00.000Z'),
      doneTime: new Date('2026-06-12T11:00:00.000Z'),
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
      nextRunAt: new Date('2020-01-01T00:00:00.000Z'),
    });
    repository.findUnadjustedWithDeadline.mockResolvedValue([task]);
    repository.claimScoreAdjustment.mockResolvedValue(task);

    await service.adjustOverdueTasks();

    expect(userService.adjustSpecialistScore).toHaveBeenCalledWith(
      userId.toString(),
      -10,
    );
  });

  function createTask(
    status: FixedTaskStatus,
    dates: { nextRunAt?: Date; doneTime?: Date },
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
