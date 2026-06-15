import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationDocument } from '../notification.schema';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationPolicyService } from './notification-policy.service';

@Injectable()
export class NotificationWriteService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly userService: UserService,
    private readonly policy: NotificationPolicyService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    const userId = this.policy.toObjectId(dto.user, 'user ID');
    const entityId = dto.entityId
      ? this.policy.toObjectId(dto.entityId, 'entity ID')
      : undefined;
    await this.userService.findById(dto.user);
    return this.repository.create(dto, userId, entityId);
  }

  async createBulk(
    notifications: CreateNotificationDto[],
  ): Promise<NotificationDocument[]> {
    const uniqueUserIds = [
      ...new Set(notifications.map((notification) => notification.user)),
    ];
    await Promise.all(
      uniqueUserIds.map((userId) => this.userService.findById(userId)),
    );

    return this.repository.createBulk(
      notifications.map((notification) => ({
        ...notification,
        user: this.policy.toObjectId(notification.user, 'user ID'),
        entityId: notification.entityId
          ? this.policy.toObjectId(notification.entityId, 'entity ID')
          : undefined,
        isRead: notification.isRead ?? false,
      })),
    );
  }
}
