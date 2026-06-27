import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';
import { TIME_PATTERN } from '../common/constants/time.constants';

export enum FixedTaskRecurrence {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum FixedTaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum FixedTaskTimingApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface FixedTaskScheduleConfig {
  weekdays?: number[];
  monthDays?: number[];
}

@Schema({ timestamps: true })
export class FixedTaskTemplate {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: FixedTaskRecurrence,
    required: true,
    index: true,
  })
  recurrence: FixedTaskRecurrence;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: String, default: null })
  taskComment?: string | null;

  @Prop({ type: Boolean, default: false, index: true })
  isActive: boolean;

  @Prop({
    type: String,
    enum: FixedTaskStatus,
    default: FixedTaskStatus.TODO,
    index: true,
  })
  status: FixedTaskStatus;

  @Prop({ type: Date })
  doneTime?: Date;

  @Prop({ type: Date, default: null })
  startedAt?: Date | null;

  @Prop({ type: Number, min: 0, default: null })
  actualDurationMinutes?: number | null;

  @Prop({ type: Number, min: 0, default: null })
  approvedDurationMinutes?: number | null;

  @Prop({
    type: String,
    enum: FixedTaskTimingApprovalStatus,
    default: FixedTaskTimingApprovalStatus.PENDING,
    index: true,
  })
  timingApprovalStatus: FixedTaskTimingApprovalStatus;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  timingApprovedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  timingApprovedAt?: Date | null;

  @Prop({ type: Boolean, default: false })
  scoreAdjusted: boolean;

  @Prop({ type: Date })
  lastGeneratedAt?: Date;

  @Prop({ type: Date })
  nextRunAt?: Date;

  @Prop({ type: String, match: TIME_PATTERN , default: null})
  startTime?: string | null;

  @Prop({ type: String, match: TIME_PATTERN , default: null})
  endTime?: string | null;

  @Prop({ type: Date, index: true })
  startDate?: Date;

  @Prop({ type: Date, index: true })
  endDate?: Date;

  @Prop({ type: String })
  sourceExcel?: string;

  @Prop({ type: String })
  sourceSheet?: string;

  @Prop({
    type: {
      weekdays: [{ type: Number, min: 0, max: 6 }],
      monthDays: [{ type: Number, min: 1, max: 31 }],
    },
    default: undefined,
    _id: false,
  })
  scheduleConfig?: FixedTaskScheduleConfig;

  @Prop({ type: Number })
  sourceRow?: number;

  @Prop({ type: Number })
  originalSourceRow?: number;
}

export type FixedTaskTemplateDocument = HydratedDocument<FixedTaskTemplate>;

export const FixedTaskTemplateSchema =
  SchemaFactory.createForClass(FixedTaskTemplate);

FixedTaskTemplateSchema.index(
  { recurrence: 1, startDate: 1, endDate: 1 },
);

FixedTaskTemplateSchema.index(
  { sourceExcel: 1, sourceSheet: 1, sourceRow: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceExcel: { $type: 'string' },
      sourceSheet: { $type: 'string' },
      sourceRow: { $type: 'number' },
    },
  },
);
