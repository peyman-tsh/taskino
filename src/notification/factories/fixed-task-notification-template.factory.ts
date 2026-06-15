import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import {
  NotificationEntityType,
  NotificationType,
} from '../notification.schema';

@Injectable()
export class FixedTaskNotificationTemplateFactory {
  assigned(
    userId: string,
    fixedTaskId: string,
    title: string,
  ): CreateNotificationDto {
    return {
      user: userId,
      title: 'Fixed Task Assigned',
      message: `You have been assigned to the fixed task: ${title}`,
      type: NotificationType.FIXED_TASK_ASSIGNED,
      link: `/fixed-tasks/${fixedTaskId}`,
      entityType: NotificationEntityType.FIXED_TASK,
      entityId: fixedTaskId,
    };
  }

  completed(
    userId: string,
    fixedTaskId: string,
    title: string,
  ): CreateNotificationDto {
    return {
      user: userId,
      title: 'Fixed Task Completed',
      message: `The fixed task "${title}" has been completed`,
      type: NotificationType.FIXED_TASK_COMPLETED,
      link: `/fixed-tasks/${fixedTaskId}`,
      entityType: NotificationEntityType.FIXED_TASK,
      entityId: fixedTaskId,
    };
  }
}
