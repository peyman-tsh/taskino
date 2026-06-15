import { Injectable } from '@nestjs/common';
import {
  FixedTaskAssignedNotificationEvent,
  FixedTaskCompletedNotificationEvent,
} from '../events/notification.events';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class FixedTaskNotificationEventHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handleAssigned(event: FixedTaskAssignedNotificationEvent): Promise<void> {
    await this.notificationService.createFixedTaskAssignedNotification(
      event.userId,
      event.fixedTaskId,
      event.fixedTaskTitle,
    );
  }

  async handleCompleted(
    event: FixedTaskCompletedNotificationEvent,
  ): Promise<void> {
    await this.notificationService.createFixedTaskCompletedNotification(
      event.creatorId,
      event.fixedTaskId,
      event.fixedTaskTitle,
    );
  }
}
