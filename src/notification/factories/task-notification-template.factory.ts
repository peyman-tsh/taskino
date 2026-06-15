import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import {
  NotificationEntityType,
  NotificationType,
} from '../notification.schema';

@Injectable()
export class TaskNotificationTemplateFactory {
  assigned(userId: string, taskId: string, title: string): CreateNotificationDto {
    return {
      user: userId,
      title: 'Task Assigned',
      message: `You have been assigned to the task: ${title}`,
      type: NotificationType.TASK_ASSIGNED,
      link: `/tasks/${taskId}`,
      entityType: NotificationEntityType.TASK,
      entityId: taskId,
    };
  }

  completed(
    userId: string,
    taskId: string,
    title: string,
    completedBy: string,
  ): CreateNotificationDto {
    return {
      user: userId,
      title: 'Task Completed',
      message: `The task "${title}" has been completed by ${completedBy}`,
      type: NotificationType.TASK_COMPLETED,
      link: `/tasks/${taskId}`,
      entityType: NotificationEntityType.TASK,
      entityId: taskId,
    };
  }

  statusChanged(title: string, status: string) {
    return {
      title: 'Task Status Updated',
      message: `The task "${title}" status changed to ${status}`,
      type: NotificationType.TASK_STATUS_CHANGED,
      isRead: false,
    };
  }
}
