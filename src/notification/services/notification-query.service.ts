import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { NotificationDocument } from '../notification.schema';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class NotificationQueryService {
  constructor(
    private readonly repository: NotificationRepository,
  ) {}

  async findMine(userId: string, queryDto: QueryNotificationDto) {
    const userObjectId = this.toObjectId(userId, 'user ID');
    const query = this.buildQuery(userObjectId, queryDto);
    const { data, total } = await this.repository.findPaginated(
      query,
      queryDto.page,
      queryDto.limit,
    );

    return { data, total, page: queryDto.page, limit: queryDto.limit };
  }

  async findMineById(userId: string, notificationId: string): Promise<NotificationDocument> {
    const notification = await this.repository.findOne({
        _id: this.toObjectId(notificationId, 'notification ID'),
        user: this.toObjectId(userId, 'user ID'),
      });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getMyUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.repository.count({
        user: this.toObjectId(userId, 'user ID'),
        isRead: false,
      });

    return { unreadCount };
  }

  private buildQuery(userId: Types.ObjectId, queryDto: QueryNotificationDto) {
    const query: Record<string, unknown> = { user: userId };

    if (queryDto.type) query.type = queryDto.type;
    if (queryDto.isRead !== undefined) query.isRead = queryDto.isRead === 'true';
    if (queryDto.search) {
      const escapedSearch = queryDto.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { message: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    return query;
  }

  private toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return new Types.ObjectId(id);
  }
}
