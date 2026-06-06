import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InternalEventBus } from '../common/events/internal-event-bus.service';
import {
  NotificationEvents,
  TaskAssignedNotificationEvent,
  TaskCompletedNotificationEvent,
} from './events/notification.events';
import { NotificationService } from './notification.service';

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
}
