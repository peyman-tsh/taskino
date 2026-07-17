import { Types } from 'mongoose';
import { TaskDocument, TaskRatingStatus } from '../task.schema';
import { TaskRepository } from '../repositories/task.repository';
import { TaskPolicyService } from './task-policy.service';
import { TaskRatingService } from './task-rating.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import { UserProgressEvents } from '../../common/events/user-progress.events';

describe('TaskRatingService', () => {
  const taskId = new Types.ObjectId();
  const managerId = new Types.ObjectId();
  const assigneeId = new Types.ObjectId();
  const repository = {
    findRawById: jest.fn(),
    updateById: jest.fn(),
  };
  const policy = { validateObjectId: jest.fn() };
  const eventBus = { publishAndWait: jest.fn() };
  const service = new TaskRatingService(
    repository as unknown as TaskRepository,
    policy as unknown as TaskPolicyService,
    eventBus as unknown as InternalEventBus,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a manager rating and refreshes the assignee progress', async () => {
    const task = {
      _id: taskId,
      assignedTo: [assigneeId],
    } as unknown as TaskDocument;
    repository.findRawById.mockResolvedValue(task);
    repository.updateById.mockResolvedValue(task);

    await expect(
      service.rate(taskId.toString(), managerId.toString(), {
        score: 4,
        comment: 'Good work',
      }),
    ).resolves.toBe(task);

    expect(repository.updateById).toHaveBeenCalledWith(
      taskId.toString(),
      expect.objectContaining({
        ratingScore: 4,
        ratingStatus: TaskRatingStatus.GOOD,
        ratingComment: 'Good work',
        ratedBy: managerId,
        ratedAt: expect.any(Date),
      }),
    );
    expect(eventBus.publishAndWait).toHaveBeenCalledWith(
      UserProgressEvents.REFRESH_REQUESTED,
      expect.objectContaining({ userIds: [assigneeId.toString()] }),
    );
  });

  it.each([
    [0, TaskRatingStatus.WEAK],
    [1, TaskRatingStatus.WEAK],
    [2, TaskRatingStatus.NORMAL],
    [3, TaskRatingStatus.NORMAL],
    [4, TaskRatingStatus.GOOD],
    [5, TaskRatingStatus.GOOD],
  ])('maps score %s to %s', async (score, ratingStatus) => {
    const task = {
      _id: taskId,
      assignedTo: [assigneeId],
    } as unknown as TaskDocument;
    repository.findRawById.mockResolvedValue(task);
    repository.updateById.mockResolvedValue(task);

    await service.rate(taskId.toString(), managerId.toString(), { score });

    expect(repository.updateById).toHaveBeenCalledWith(
      taskId.toString(),
      expect.objectContaining({ ratingScore: score, ratingStatus }),
    );
  });
});
