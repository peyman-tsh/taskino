import { Types } from 'mongoose';
import {
  FixedTaskRatingStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { FixedTaskRatingService } from './fixed-task-rating.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import { UserProgressEvents } from '../../common/events/user-progress.events';

describe('FixedTaskRatingService', () => {
  const fixedTaskId = new Types.ObjectId();
  const managerId = new Types.ObjectId();
  const assigneeId = new Types.ObjectId();
  const repository = {
    findRawById: jest.fn(),
    updateById: jest.fn(),
  };
  const policy = {
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
  };
  const notificationService = {
    notifyRated: jest.fn(),
  };
  const eventBus = {
    publishAndWait: jest.fn(),
  };
  const service = new FixedTaskRatingService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
    notificationService as unknown as FixedTaskNotificationService,
    eventBus as unknown as InternalEventBus,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores manager rating, notifies assignee, and refreshes progress', async () => {
    const fixedTask = {
      _id: fixedTaskId,
      title: 'Daily report',
      assignedTo: assigneeId,
    } as FixedTaskTemplateDocument;
    const ratedTask = {
      ...fixedTask,
      ratingScore: 4,
      ratingStatus: FixedTaskRatingStatus.GOOD,
    };
    repository.findRawById.mockResolvedValue(fixedTask);
    repository.updateById.mockResolvedValue(ratedTask);

    const result = await service.rate(
      fixedTaskId.toString(),
      managerId.toString(),
      { score: 4, comment: 'Good work' },
    );

    expect(result).toBe(ratedTask);
    expect(repository.updateById).toHaveBeenCalledWith(
      fixedTaskId,
      expect.objectContaining({
        ratingScore: 4,
        ratingStatus: FixedTaskRatingStatus.GOOD,
        ratingComment: 'Good work',
        ratedBy: managerId,
        ratedAt: expect.any(Date),
      }),
    );
    expect(notificationService.notifyRated).toHaveBeenCalledWith(
      assigneeId.toString(),
      fixedTaskId.toString(),
      'Daily report',
      4,
    );
    expect(eventBus.publishAndWait).toHaveBeenCalledWith(
      UserProgressEvents.REFRESH_REQUESTED,
      expect.objectContaining({
        userIds: [assigneeId.toString()],
      }),
    );
  });

  it('stores zero as weak rating', async () => {
    const fixedTask = {
      _id: fixedTaskId,
      title: 'Daily report',
      assignedTo: assigneeId,
    } as FixedTaskTemplateDocument;
    repository.findRawById.mockResolvedValue(fixedTask);
    repository.updateById.mockResolvedValue(fixedTask);

    await service.rate(fixedTaskId.toString(), managerId.toString(), {
      score: 0,
    });

    expect(repository.updateById).toHaveBeenCalledWith(
      fixedTaskId,
      expect.objectContaining({
        ratingScore: 0,
        ratingStatus: FixedTaskRatingStatus.WEAK,
      }),
    );
  });
});
