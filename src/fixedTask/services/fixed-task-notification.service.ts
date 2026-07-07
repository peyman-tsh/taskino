import { Injectable } from '@nestjs/common';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  FixedTaskAssignedNotificationEvent,
  FixedTaskCompletedNotificationEvent,
  FixedTaskRatedNotificationEvent,
  NotificationEvents,
} from '../../notification/events/notification.events';

@Injectable()
export class FixedTaskNotificationService {
  constructor(private readonly eventBus: InternalEventBus) {}

  notifyAssigned(userId: string, fixedTaskId: string, title: string): void {
    this.eventBus.publish(
      NotificationEvents.FIXED_TASK_ASSIGNED,
      new FixedTaskAssignedNotificationEvent(userId, fixedTaskId, title),
    );
  }

  notifyCreatorWhenCompleted(
    creatorId: string,
    fixedTaskId: string,
    title: string,
  ): void {
    this.eventBus.publish(
      NotificationEvents.FIXED_TASK_COMPLETED,
      new FixedTaskCompletedNotificationEvent(creatorId, fixedTaskId, title),
    );
  }

  notifyManagersWhenCompleted(
    managerIds: string[],
    fixedTaskId: string,
    title: string,
  ): void {
    [...new Set(managerIds)].forEach((managerId) =>
      this.eventBus.publish(
        NotificationEvents.FIXED_TASK_COMPLETED,
        new FixedTaskCompletedNotificationEvent(managerId, fixedTaskId, title),
      ),
    );
  }

  notifyRated(
    userId: string,
    fixedTaskId: string,
    title: string,
    score: number,
  ): void {
    this.eventBus.publish(
      NotificationEvents.FIXED_TASK_RATED,
      new FixedTaskRatedNotificationEvent(userId, fixedTaskId, title, score),
    );
  }
}
