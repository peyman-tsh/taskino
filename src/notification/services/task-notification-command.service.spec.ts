import { Types } from 'mongoose';
import { NotificationEntityType } from '../notification.schema';
import { NotificationTemplateFactory } from '../notification-template.factory';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPolicyService } from './notification-policy.service';
import { NotificationWriteService } from './notification-write.service';
import { TaskNotificationCommandService } from './task-notification-command.service';
import { TaskNotificationTemplateFactory } from '../factories/task-notification-template.factory';
import { FixedTaskNotificationTemplateFactory } from '../factories/fixed-task-notification-template.factory';
import { GeneralNotificationTemplateFactory } from '../factories/general-notification-template.factory';

describe('TaskNotificationCommandService', () => {
  const writer = { create: jest.fn() };
  const repository = { updateMany: jest.fn() };
  const policy = { toObjectId: jest.fn((id: string) => new Types.ObjectId(id)) };
  const service = new TaskNotificationCommandService(
    writer as unknown as NotificationWriteService,
    repository as unknown as NotificationRepository,
    policy as unknown as NotificationPolicyService,
    new NotificationTemplateFactory(
      new TaskNotificationTemplateFactory(),
      new FixedTaskNotificationTemplateFactory(),
      new GeneralNotificationTemplateFactory(),
    ),
  );

  it('stores task entity information for assigned notifications', async () => {
    const userId = new Types.ObjectId().toString();
    const taskId = new Types.ObjectId().toString();

    await service.createAssigned(userId, taskId, 'Task title');

    expect(writer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: NotificationEntityType.TASK,
        entityId: taskId,
        link: `/tasks/${taskId}`,
      }),
    );
  });

  it('updates task notifications using entity information and legacy link', async () => {
    const taskId = new Types.ObjectId().toString();

    await service.updateStatus(taskId, 'Task title', 'in_progress');

    expect(repository.updateMany).toHaveBeenCalledWith(
      {
        $or: [
          {
            entityType: NotificationEntityType.TASK,
            entityId: expect.anything(),
          },
          { link: `/tasks/${taskId}` },
        ],
      },
      expect.objectContaining({ isRead: false }),
    );
  });
});
