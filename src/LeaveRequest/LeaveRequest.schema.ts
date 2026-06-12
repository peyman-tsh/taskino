import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';

export type LeaveDocument = HydratedDocument<Leave>;

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
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
    required: true,
  })
  startDate: string;

  @Prop({
    required: true,
  })
  endDate: string;

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
