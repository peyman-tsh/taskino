import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InternalEventBus } from '../common/events/internal-event-bus.service';
import {
  FixedTaskAssignedNotificationEvent,
  FixedTaskCompletedNotificationEvent,
  NotificationEvents,
  TaskAssignedNotificationEvent,
  TaskCompletedNotificationEvent,
  TaskStatusChangedNotificationEvent,
  UserRegisteredNotificationEvent,
} from './events/notification.events';
import { FixedTaskNotificationEventHandler } from './handlers/fixed-task-notification-event.handler';
import { TaskNotificationEventHandler } from './handlers/task-notification-event.handler';
import { UserNotificationEventHandler } from './handlers/user-notification-event.handler';

@Injectable()
export class NotificationEventListener implements OnModuleInit, OnModuleDestroy {
  private readonly unsubscribeHandlers: Array<() => void> = [];

  constructor(
    private readonly eventBus: InternalEventBus,
    private readonly taskHandler: TaskNotificationEventHandler,
    private readonly fixedTaskHandler: FixedTaskNotificationEventHandler,
    private readonly userHandler: UserNotificationEventHandler,
  ) {}

  onModuleInit(): void {
    this.unsubscribeHandlers.push(
      this.eventBus.subscribe<TaskAssignedNotificationEvent>(
        NotificationEvents.TASK_ASSIGNED,
        (event) => this.taskHandler.handleAssigned(event),
      ),
      this.eventBus.subscribe<TaskCompletedNotificationEvent>(
        NotificationEvents.TASK_COMPLETED,
        (event) => this.taskHandler.handleCompleted(event),
      ),
      this.eventBus.subscribe<TaskStatusChangedNotificationEvent>(
        NotificationEvents.TASK_STATUS_CHANGED,
        (event) => this.taskHandler.handleStatusChanged(event),
      ),
      this.eventBus.subscribe<FixedTaskAssignedNotificationEvent>(
        NotificationEvents.FIXED_TASK_ASSIGNED,
        (event) => this.fixedTaskHandler.handleAssigned(event),
      ),
      this.eventBus.subscribe<FixedTaskCompletedNotificationEvent>(
        NotificationEvents.FIXED_TASK_COMPLETED,
        (event) => this.fixedTaskHandler.handleCompleted(event),
      ),
      this.eventBus.subscribe<UserRegisteredNotificationEvent>(
        NotificationEvents.USER_REGISTERED,
        (event) => this.userHandler.handleRegistered(event),
      ),
    );
  }

  onModuleDestroy(): void {
    this.unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
  }
}
