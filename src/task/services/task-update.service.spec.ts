import { Types } from 'mongoose';
import { TaskRepository } from '../repositories/task.repository';
import { TaskDocument, TaskStatus } from '../task.schema';
import { TaskNotificationService } from './task-notification.service';
import { TaskPolicyService } from './task-policy.service';
import { TaskScoreService } from './task-score.service';
import { TaskUpdateService } from './task-update.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import { UserProgressEvents } from '../../common/events/user-progress.events';

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
    notifyStatusChanged: jest.fn(),
  };
  const scoreService = {
    adjustCompletedTaskScore: jest.fn(),
  };
  const eventBus = { publish: jest.fn() };
  const service = new TaskUpdateService(
    repository as unknown as TaskRepository,
    policy as unknown as TaskPolicyService,
    notificationService as unknown as TaskNotificationService,
    scoreService as unknown as TaskScoreService,
    eventBus as unknown as InternalEventBus,
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
    expect(notificationService.notifyStatusChanged).toHaveBeenCalledWith(
      taskId.toString(),
      updatedTask.title,
      TaskStatus.DONE,
    );
    expect(notificationService.notifyCreatorWhenCompleted).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(
      UserProgressEvents.REFRESH_REQUESTED,
      expect.objectContaining({
        userIds: [assigneeId.toString()],
      }),
    );
  });

  it('sets end date and end time when an extra task is completed', async () => {
    const task = {
      ...createTask(TaskStatus.IN_PROGRESS),
      isExtraTask: true,
    } as TaskDocument;
    const updatedTask = {
      ...task,
      status: TaskStatus.DONE,
    } as TaskDocument;
    repository.findRawById.mockResolvedValue(task);
    repository.updateById.mockResolvedValue(updatedTask);

    await service.update(taskId.toString(), { status: TaskStatus.DONE });

    expect(repository.updateById).toHaveBeenCalledWith(
      taskId.toString(),
      expect.objectContaining({
        status: TaskStatus.DONE,
        doneTime: expect.any(Date),
        endDate: expect.any(Date),
        endTime: expect.stringMatching(/^\d{2}:\d{2}$/),
      }),
    );
  });

  function createTask(status: TaskStatus): TaskDocument {
    return {
      _id: taskId,
      title: 'Task',
      createdBy: creatorId,
      assignedTo: [assigneeId],
      status,
      isExtraTask: false,
    } as TaskDocument;
  }
});
