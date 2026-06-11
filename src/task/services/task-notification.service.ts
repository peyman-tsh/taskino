import { Injectable } from '@nestjs/common';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  NotificationEvents,
  TaskAssignedNotificationEvent,
  TaskCompletedNotificationEvent,
} from '../../notification/events/notification.events';

@Injectable()
export class TaskNotificationService {
  constructor(private readonly eventBus: InternalEventBus) {}

  notifyAssignedUsers(
    userIds: string[],
    taskId: string,
    taskTitle: string,
  ): void {
    if (userIds.length === 0) {
      return;
    }

    this.eventBus.publish(
      NotificationEvents.TASK_ASSIGNED,
      new TaskAssignedNotificationEvent(userIds, taskId, taskTitle),
    );
  }

  notifyCreatorWhenCompleted(
    creatorId: string,
    taskId: string,
    taskTitle: string,
  ): void {
    this.eventBus.publish(
      NotificationEvents.TASK_COMPLETED,
      new TaskCompletedNotificationEvent(
        creatorId,
        taskId,
        taskTitle,
        'an assigned user',
      ),
    );
  }
}
