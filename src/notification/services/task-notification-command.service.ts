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
