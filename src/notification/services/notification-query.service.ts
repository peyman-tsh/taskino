import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { NotificationDocument } from '../notification.schema';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPolicyService } from './notification-policy.service';
import { NotificationQueryFilterBuilder } from './notification-query-filter.builder';

@Injectable()
export class NotificationQueryService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly policy: NotificationPolicyService,
    private readonly filterBuilder: NotificationQueryFilterBuilder,
  ) {}

  async findMine(userId: string, queryDto: QueryNotificationDto) {
    const userObjectId = this.policy.toObjectId(userId, 'user ID');
    const query = this.filterBuilder.build(userObjectId, queryDto);
    const { data, total } = await this.repository.findPaginated(
      query,
      queryDto.page,
      queryDto.limit,
    );

    return { data, total, page: queryDto.page, limit: queryDto.limit };
  }

  async findMineById(userId: string, notificationId: string): Promise<NotificationDocument> {
    const notification = await this.repository.findOne({
        _id: this.policy.toObjectId(notificationId, 'notification ID'),
        user: this.policy.toObjectId(userId, 'user ID'),
      });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getMyUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.repository.count({
        user: this.policy.toObjectId(userId, 'user ID'),
        isRead: false,
      });

    return { unreadCount };
  }

}
