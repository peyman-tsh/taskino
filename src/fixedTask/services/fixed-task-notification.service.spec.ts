import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  FixedTaskAssignedNotificationEvent,
  FixedTaskCompletedNotificationEvent,
  FixedTaskRatedNotificationEvent,
  NotificationEvents,
} from '../../notification/events/notification.events';
import { FixedTaskNotificationService } from './fixed-task-notification.service';

describe('FixedTaskNotificationService', () => {
  const eventBus = { publish: jest.fn() };
  const service = new FixedTaskNotificationService(
    eventBus as unknown as InternalEventBus,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes fixed task assigned event', () => {
    service.notifyAssigned('user-id', 'fixed-id', 'Daily report');

    expect(eventBus.publish).toHaveBeenCalledWith(
      NotificationEvents.FIXED_TASK_ASSIGNED,
      expect.any(FixedTaskAssignedNotificationEvent),
    );
  });

  it('publishes fixed task completed event', () => {
    service.notifyCreatorWhenCompleted(
      'creator-id',
      'fixed-id',
      'Daily report',
    );

    expect(eventBus.publish).toHaveBeenCalledWith(
      NotificationEvents.FIXED_TASK_COMPLETED,
      expect.any(FixedTaskCompletedNotificationEvent),
    );
  });

  it('publishes fixed task rated event', () => {
    service.notifyRated('user-id', 'fixed-id', 'Daily report', 4);

    expect(eventBus.publish).toHaveBeenCalledWith(
      NotificationEvents.FIXED_TASK_RATED,
      expect.any(FixedTaskRatedNotificationEvent),
    );
  });
});
