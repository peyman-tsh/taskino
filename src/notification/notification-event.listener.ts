import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InternalEventBus } from '../common/events/internal-event-bus.service';
import {
  NotificationEvents,
  FixedTaskAssignedNotificationEvent,
  FixedTaskCompletedNotificationEvent,
  TaskAssignedNotificationEvent,
  TaskCompletedNotificationEvent,
  TaskStatusChangedNotificationEvent,
  UserRegisteredNotificationEvent,
} from './events/notification.events';
import { NotificationService } from './services/notification.service';

@Injectable()
export class NotificationEventListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationEventListener.name);
  private readonly unsubscribeHandlers: Array<() => void> = [];

  constructor(
    private readonly eventBus: InternalEventBus,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit(): void {
    this.unsubscribeHandlers.push(
      this.eventBus.subscribe<TaskAssignedNotificationEvent>(
        NotificationEvents.TASK_ASSIGNED,
        (event) => this.handleTaskAssigned(event),
      ),
      this.eventBus.subscribe<TaskCompletedNotificationEvent>(
        NotificationEvents.TASK_COMPLETED,
        (event) => this.handleTaskCompleted(event),
      ),
      this.eventBus.subscribe<TaskStatusChangedNotificationEvent>(
        NotificationEvents.TASK_STATUS_CHANGED,
        (event) => this.handleTaskStatusChanged(event),
      ),
      this.eventBus.subscribe<FixedTaskAssignedNotificationEvent>(
        NotificationEvents.FIXED_TASK_ASSIGNED,
        (event) => this.handleFixedTaskAssigned(event),
      ),
      this.eventBus.subscribe<FixedTaskCompletedNotificationEvent>(
        NotificationEvents.FIXED_TASK_COMPLETED,
        (event) => this.handleFixedTaskCompleted(event),
      ),
      this.eventBus.subscribe<UserRegisteredNotificationEvent>(
        NotificationEvents.USER_REGISTERED,
        (event) => this.handleUserRegistered(event),
      ),
    );
  }

  onModuleDestroy(): void {
    this.unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
  }

  private async handleTaskAssigned(event: TaskAssignedNotificationEvent): Promise<void> {
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
      if (result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.warn(`Skipped task assignment notification for user ${uniqueUserIds[index]}: ${reason}`);
      }
    });
  }

  private async handleTaskCompleted(event: TaskCompletedNotificationEvent): Promise<void> {
    await this.notificationService.createTaskCompletedNotification(
      event.creatorId,
      event.taskId,
      event.taskTitle,
      event.completedBy,
    );
  }

  private async handleTaskStatusChanged(
    event: TaskStatusChangedNotificationEvent,
  ): Promise<void> {
    await this.notificationService.updateTaskNotificationsStatus(
      event.taskId,
      event.taskTitle,
      event.status,
    );
  }

  private async handleFixedTaskAssigned(
    event: FixedTaskAssignedNotificationEvent,
  ): Promise<void> {
    await this.notificationService.createFixedTaskAssignedNotification(
      event.userId,
      event.fixedTaskId,
      event.fixedTaskTitle,
    );
  }

  private async handleFixedTaskCompleted(
    event: FixedTaskCompletedNotificationEvent,
  ): Promise<void> {
    await this.notificationService.createFixedTaskCompletedNotification(
      event.creatorId,
      event.fixedTaskId,
      event.fixedTaskTitle,
    );
  }

  private async handleUserRegistered(
    event: UserRegisteredNotificationEvent,
  ): Promise<void> {
    await this.notificationService.createUserRegistrationApprovalNotifications(
      event.userId,
      event.firstName,
      event.lastName,
      event.workField,
    );
  }
}
