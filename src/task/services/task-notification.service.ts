import { Injectable } from '@nestjs/common';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  NotificationEvents,
  TaskAssignedNotificationEvent,
  TaskCreatedForManagerNotificationEvent,
  TaskCompletedNotificationEvent,
  TaskStatusChangedNotificationEvent,
} from '../../notification/events/notification.events';

@Injectable()
export class TaskNotificationService {
  constructor(private readonly eventBus: InternalEventBus) {}

  notifyAssignedUsers(
    userIds: string[],
    taskId: string,
    taskTitle: string,
  ): Promise<void> {
    if (userIds.length === 0) {
      return Promise.resolve();
    }

    return this.eventBus.publishAndWait(
      NotificationEvents.TASK_ASSIGNED,
      new TaskAssignedNotificationEvent(userIds, taskId, taskTitle),
    );
  }

  notifyManagersWhenCreated(
    userIds: string[],
    taskId: string,
    taskTitle: string,
    isExtraTask: boolean,
  ): Promise<void> {
    if (userIds.length === 0) {
      return Promise.resolve();
    }

    return this.eventBus.publishAndWait(
      NotificationEvents.TASK_CREATED_FOR_MANAGER,
      new TaskCreatedForManagerNotificationEvent(
        userIds,
        taskId,
        taskTitle,
        isExtraTask,
      ),
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

  notifyStatusChanged(taskId: string, taskTitle: string, status: string): void {
    this.eventBus.publish(
      NotificationEvents.TASK_STATUS_CHANGED,
      new TaskStatusChangedNotificationEvent(taskId, taskTitle, status),
    );
  }
}
