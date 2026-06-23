import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';
import { TIME_PATTERN } from '../common/constants/time.constants';

export type LeaveDocument = HydratedDocument<Leave>;

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum LeaveRecurrence {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  HOURLY = 'hourly',
}

@Schema({
  timestamps: true,
})
export class Leave {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  startDate: Date;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  endDate: Date;

  @Prop({
    type: String,
    enum: LeaveRecurrence,
    required: true,
    index: true,
  })
  recurrence: LeaveRecurrence;

  @Prop({ type: String, match: TIME_PATTERN })
  startTime?: string;

  @Prop({ type: String, match: TIME_PATTERN })
  endTime?: string;

  @Prop({
    trim: true,
    default: '',
  })
  reason: string;

  @Prop({
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
  })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: string;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Boolean, default: false })
  approvedByManger: boolean;
}

export const LeaveSchema = SchemaFactory.createForClass(Leave);

LeaveSchema.index({ recurrence: 1, startDate: 1, endDate: 1 });
