import { Types } from 'mongoose';
import { TaskRepository } from '../repositories/task.repository';
import { TaskDocument, TaskStatus } from '../task.schema';
import { TaskNotificationService } from './task-notification.service';
import { TaskPolicyService } from './task-policy.service';
import { TaskScoreService } from './task-score.service';
import { TaskUpdateService } from './task-update.service';

describe('TaskUpdateService', () => {
  const creatorId = new Types.ObjectId();
  const assigneeId = new Types.ObjectId();
  const taskId = new Types.ObjectId();
  const repository = {
    findRawById: jest.fn(),
    updateById: jest.fn(),
  };
  const policy = {
    validateObjectId: jest.fn(),
    parseDateTime: jest.fn((value: string) => new Date(value)),
    assertValidDeadline: jest.fn(),
    assertValidTimeRange: jest.fn(),
    assertSingleAssignee: jest.fn(),
    assertValidAssigneeIds: jest.fn(),
    assertParticipants: jest.fn(),
  };
  const notificationService = {
    notifyAssignedUsers: jest.fn(),
    notifyCreatorWhenCompleted: jest.fn(),
  };
  const scoreService = {
    adjustCompletedTaskScore: jest.fn(),
  };
  const service = new TaskUpdateService(
    repository as unknown as TaskRepository,
    policy as unknown as TaskPolicyService,
    notificationService as unknown as TaskNotificationService,
    scoreService as unknown as TaskScoreService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records completion and runs score and notification actions', async () => {
    const task = createTask(TaskStatus.IN_PROGRESS);
    const updatedTask = createTask(TaskStatus.DONE);
    repository.findRawById.mockResolvedValue(task);
    repository.updateById.mockResolvedValue(updatedTask);

    await service.update(taskId.toString(), { status: TaskStatus.DONE });

    expect(repository.updateById).toHaveBeenCalledWith(
      taskId.toString(),
      expect.objectContaining({
        status: TaskStatus.DONE,
        doneTime: expect.any(Date),
      }),
    );
    expect(scoreService.adjustCompletedTaskScore).toHaveBeenCalledWith(
      updatedTask,
    );
    expect(notificationService.notifyCreatorWhenCompleted).toHaveBeenCalled();
  });

  function createTask(status: TaskStatus): TaskDocument {
    return {
      _id: taskId,
      title: 'Task',
      createdBy: creatorId,
      assignedTo: [assigneeId],
      status,
    } as TaskDocument;
  }
});
