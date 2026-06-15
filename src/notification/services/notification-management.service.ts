import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationDocument } from '../notification.schema';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPolicyService } from './notification-policy.service';

@Injectable()
export class NotificationManagementService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly policy: NotificationPolicyService,
  ) {}

  async findOneUnread(userId: string) {
    const notification = await this.repository.findOne({
      user: this.policy.toObjectId(userId, 'user ID'),
      isRead: false,
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async updateMyReadStatus(
    userId: string,
    notificationId: string,
    isRead: boolean,
  ): Promise<NotificationDocument> {
    const notification = await this.repository.findOneAndUpdate(
      {
        _id: this.policy.toObjectId(notificationId, 'notification ID'),
        user: this.policy.toObjectId(userId, 'user ID'),
      },
      { isRead },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllMineAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.repository.updateMany(
      {
        user: this.policy.toObjectId(userId, 'user ID'),
        isRead: false,
      },
      { isRead: true },
    );
    return { modifiedCount: result.modifiedCount };
  }

  async deleteMine(userId: string, notificationId: string): Promise<void> {
    const notification = await this.repository.findOneAndDelete({
      _id: this.policy.toObjectId(notificationId, 'notification ID'),
      user: this.policy.toObjectId(userId, 'user ID'),
    });
    if (!notification) throw new NotFoundException('Notification not found');
  }

  async deleteMyReadNotifications(userId: string) {
    const result = await this.repository.deleteMany({
      user: this.policy.toObjectId(userId, 'user ID'),
      isRead: true,
    });
    return { deletedCount: result.deletedCount };
  }
}
