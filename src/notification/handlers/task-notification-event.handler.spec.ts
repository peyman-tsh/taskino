import { TaskAssignedNotificationEvent } from '../events/notification.events';
import { NotificationService } from '../services/notification.service';
import { TaskNotificationEventHandler } from './task-notification-event.handler';

describe('TaskNotificationEventHandler', () => {
  const notificationService = { createTaskAssignedNotification: jest.fn() };
  const handler = new TaskNotificationEventHandler(
    notificationService as unknown as NotificationService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates one assignment notification per unique user', async () => {
    notificationService.createTaskAssignedNotification.mockResolvedValue({});

    await handler.handleAssigned(
      new TaskAssignedNotificationEvent(
        ['user-1', 'user-1', 'user-2'],
        'task-id',
        'Task title',
      ),
    );

    expect(notificationService.createTaskAssignedNotification).toHaveBeenCalledTimes(2);
  });
});
