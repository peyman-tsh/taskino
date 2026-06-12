import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  NotificationEvents,
  TaskStatusChangedNotificationEvent,
} from '../../notification/events/notification.events';
import { TaskNotificationService } from './task-notification.service';

describe('TaskNotificationService', () => {
  const eventBus = { publish: jest.fn() };
  const service = new TaskNotificationService(
    eventBus as unknown as InternalEventBus,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes task status changed event', () => {
    service.notifyStatusChanged('task-id', 'Task title', 'in_progress');

    expect(eventBus.publish).toHaveBeenCalledWith(
      NotificationEvents.TASK_STATUS_CHANGED,
      expect.any(TaskStatusChangedNotificationEvent),
    );
  });
});
