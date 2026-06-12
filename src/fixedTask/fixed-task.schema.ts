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

  @Prop({ type: Boolean, default: true, index: true })
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

  @Prop({ type: Boolean, default: false })
  scoreAdjusted: boolean;

  @Prop({ type: Date })
  lastGeneratedAt?: Date;

  @Prop({ type: Date })
  nextRunAt?: Date;

  @Prop({ type: String, match: TIME_PATTERN })
  startTime?: string;

  @Prop({ type: String, match: TIME_PATTERN })
  endTime?: string;

  @Prop({ type: Date, index: true })
  endDate?: Date;

  @Prop({ type: String })
  sourceExcel?: string;

  @Prop({ type: String })
  sourceSheet?: string;

  @Prop({ type: Number })
  sourceRow?: number;
}

export type FixedTaskTemplateDocument = HydratedDocument<FixedTaskTemplate>;

export const FixedTaskTemplateSchema =
  SchemaFactory.createForClass(FixedTaskTemplate);

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
