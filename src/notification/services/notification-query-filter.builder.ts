import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { QueryNotificationDto } from '../dto/query-notification.dto';
import { NotificationPolicyService } from './notification-policy.service';

@Injectable()
export class NotificationQueryFilterBuilder {
  constructor(private readonly policy: NotificationPolicyService) {}

  build(userId: Types.ObjectId, dto: QueryNotificationDto) {
    const query: Record<string, unknown> = { user: userId };
    if (dto.type) query.type = dto.type;
    if (dto.isRead !== undefined) query.isRead = dto.isRead === 'true';
    if (dto.entityType) query.entityType = dto.entityType;
    if (dto.entityId) {
      query.entityId = this.policy.toObjectId(dto.entityId, 'entity ID');
    }
    if (dto.search) {
      const escapedSearch = this.policy.escapeRegex(dto.search);
      query.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { message: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    return query;
  }
}
