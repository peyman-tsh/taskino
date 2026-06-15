import { Injectable, Logger } from '@nestjs/common';
import {
  TaskAssignedNotificationEvent,
  TaskCompletedNotificationEvent,
  TaskStatusChangedNotificationEvent,
} from '../events/notification.events';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class TaskNotificationEventHandler {
  private readonly logger = new Logger(TaskNotificationEventHandler.name);

  constructor(private readonly notificationService: NotificationService) {}

  async handleAssigned(event: TaskAssignedNotificationEvent): Promise<void> {
    const uniqueUserIds = [...new Set(event.userIds)];
    const results = await Promise.allSettled(
      uniqueUserIds.map((userId) =>
        this.notificationService.createTaskAssignedNotification(
          userId,
          event.taskId,
          event.taskTitle,
        ),
      ),
    );

    results.forEach((result, index) => {
      if (result.status !== 'rejected') return;
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      this.logger.warn(
        `Skipped task assignment notification for user ${uniqueUserIds[index]}: ${reason}`,
      );
    });
  }

  async handleCompleted(event: TaskCompletedNotificationEvent): Promise<void> {
    await this.notificationService.createTaskCompletedNotification(
      event.creatorId,
      event.taskId,
      event.taskTitle,
      event.completedBy,
    );
  }

  async handleStatusChanged(
    event: TaskStatusChangedNotificationEvent,
  ): Promise<void> {
    await this.notificationService.updateTaskNotificationsStatus(
      event.taskId,
      event.taskTitle,
      event.status,
    );
  }
}
