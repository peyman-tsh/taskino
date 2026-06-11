import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { Notification, NotificationDocument } from '../notification.schema';

@Injectable()
export class NotificationQueryService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async findMine(userId: string, queryDto: QueryNotificationDto) {
    const userObjectId = this.toObjectId(userId, 'user ID');
    const query = this.buildQuery(userObjectId, queryDto);
    const skip = (queryDto.page - 1) * queryDto.limit;
    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(queryDto.limit)
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]);

    return { data, total, page: queryDto.page, limit: queryDto.limit };
  }

  async findMineById(userId: string, notificationId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel
      .findOne({
        _id: this.toObjectId(notificationId, 'notification ID'),
        user: this.toObjectId(userId, 'user ID'),
      })
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getMyUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationModel
      .countDocuments({
        user: this.toObjectId(userId, 'user ID'),
        isRead: false,
      })
      .exec();

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
