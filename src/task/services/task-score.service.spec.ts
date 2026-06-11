import { Types } from 'mongoose';
import { UserService } from '../../user/services/user.service';
import { TaskRepository } from '../repositories/task.repository';
import { TaskDocument, TaskStatus } from '../task.schema';
import { TaskScoreService } from './task-score.service';

describe('TaskScoreService', () => {
  const repository = {
    claimScoreAdjustment: jest.fn(),
    findUnadjustedOverdue: jest.fn(),
  };
  const userService = {
    adjustSpecialistScore: jest.fn(),
  };
  const service = new TaskScoreService(
    repository as unknown as TaskRepository,
    userService as unknown as UserService,
  );
  const userId = new Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds 10 for a task completed before its deadline', async () => {
    const task = createTask(TaskStatus.DONE, {
      dueDate: new Date('2026-06-12T12:00:00.000Z'),
      doneTime: new Date('2026-06-12T11:00:00.000Z'),
    });
    repository.claimScoreAdjustment.mockResolvedValue(task);

    await service.adjustCompletedTaskScore(task);

    expect(userService.adjustSpecialistScore).toHaveBeenCalledWith(
      userId.toString(),
      10,
    );
  });

  it('subtracts 10 for an overdue unfinished task', async () => {
    const task = createTask(TaskStatus.IN_PROGRESS, {
      dueDate: new Date('2020-01-01T00:00:00.000Z'),
    });
    repository.findUnadjustedOverdue.mockResolvedValue([task]);
    repository.claimScoreAdjustment.mockResolvedValue(task);

    await service.adjustOverdueTasks();

    expect(userService.adjustSpecialistScore).toHaveBeenCalledWith(
      userId.toString(),
      -10,
    );
  });

  it('does not apply score twice when adjustment was already claimed', async () => {
    const task = createTask(TaskStatus.DONE, {
      dueDate: new Date('2026-06-12T12:00:00.000Z'),
      doneTime: new Date('2026-06-12T11:00:00.000Z'),
    });
    repository.claimScoreAdjustment.mockResolvedValue(null);

    await service.adjustCompletedTaskScore(task);

    expect(userService.adjustSpecialistScore).not.toHaveBeenCalled();
  });

  function createTask(
    status: TaskStatus,
    dates: { dueDate?: Date; doneTime?: Date },
  ): TaskDocument {
    return {
      _id: new Types.ObjectId(),
      assignedTo: [userId],
      status,
      ...dates,
    } as TaskDocument;
  }
});
