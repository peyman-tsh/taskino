import {
  NotificationEntityType,
  NotificationType,
} from './notification.schema';
import { NotificationTemplateFactory } from './notification-template.factory';

describe('NotificationTemplateFactory', () => {
  const factory = new NotificationTemplateFactory();
  const userId = '507f1f77bcf86cd799439011';
  const entityId = '507f1f77bcf86cd799439012';

  it('adds task entity information to task notifications', () => {
    const notification = factory.taskAssigned(userId, entityId, 'Task title');

    expect(notification).toEqual(
      expect.objectContaining({
        type: NotificationType.TASK_ASSIGNED,
        entityType: NotificationEntityType.TASK,
        entityId,
      }),
    );
  });

  it('adds fixed task entity information to fixed task notifications', () => {
    const notification = factory.fixedTaskCompleted(
      userId,
      entityId,
      'Fixed task title',
    );

    expect(notification).toEqual(
      expect.objectContaining({
        type: NotificationType.FIXED_TASK_COMPLETED,
        entityType: NotificationEntityType.FIXED_TASK,
        entityId,
      }),
    );
  });
});
