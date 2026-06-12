import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_STATUS_CHANGED = 'task_status_changed',
  FIXED_TASK_ASSIGNED = 'fixed_task_assigned',
  FIXED_TASK_COMPLETED = 'fixed_task_completed',
  TASK_COMPLETION_STATS = 'task_completion_stats',
  DATE_COUNT = 'date_count',
  LEAVE_REQUEST = 'leave_request',
  LEAVE_APPROVED = 'leave_approved',
  LEAVE_REJECTED = 'leave_rejected',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId;

  @Prop({
    required: true,
  })
  title: string;

  @Prop({
    required: true,
  })
  message: string;

  @Prop({
    enum: NotificationType,
    required: true,
  })
  type: NotificationType;

  @Prop({
    default: false,
  })
  isRead: boolean;

  @Prop()
  link?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
