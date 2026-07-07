import { Injectable } from '@nestjs/common';
import { NotificationEntityType } from '../notification.schema';
import { NotificationTemplateFactory } from '../notification-template.factory';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPolicyService } from './notification-policy.service';
import { NotificationWriteService } from './notification-write.service';

@Injectable()
export class TaskNotificationCommandService {
  constructor(
    private readonly writer: NotificationWriteService,
    private readonly repository: NotificationRepository,
    private readonly policy: NotificationPolicyService,
    private readonly templates: NotificationTemplateFactory,
  ) {}

  createAssigned(userId: string, taskId: string, title: string) {
    return this.writer.create(this.templates.taskAssigned(userId, taskId, title));
  }

  createCreatedForManagers(
    userIds: string[],
    taskId: string,
    title: string,
    isExtraTask: boolean,
  ) {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length === 0) return Promise.resolve([]);

    return this.writer.createBulk(
      uniqueUserIds.map((userId) =>
        this.templates.taskCreatedForManager(
          userId,
          taskId,
          title,
          isExtraTask,
        ),
      ),
    );
  }

  createCompleted(
    userId: string,
    taskId: string,
    title: string,
    completedBy: string,
  ) {
    return this.writer.create(
      this.templates.taskCompleted(userId, taskId, title, completedBy),
    );
  }

  updateStatus(taskId: string, title: string, status: string) {
    const entityId = this.policy.toObjectId(taskId, 'task ID');
    return this.repository.updateMany(
      {
        $or: [
          { entityType: NotificationEntityType.TASK, entityId },
          { link: `/tasks/${taskId}` },
        ],
      },
      this.templates.taskStatusChanged(title, status),
    );
  }
}
