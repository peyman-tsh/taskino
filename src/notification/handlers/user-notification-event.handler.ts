import { Injectable } from '@nestjs/common';
import { UserRegisteredNotificationEvent } from '../events/notification.events';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class UserNotificationEventHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handleRegistered(event: UserRegisteredNotificationEvent): Promise<void> {
    await this.notificationService.createUserRegistrationApprovalNotifications(
      event.userId,
      event.firstName,
      event.lastName,
      event.workField,
    );
  }
}
