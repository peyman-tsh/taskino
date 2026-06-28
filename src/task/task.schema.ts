import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';
import { TIME_PATTERN } from '../common/constants/time.constants';
import { ExcelFile } from '../excel/excel.schema';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum TaskRecurrence {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ExtraTaskApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: User.name }],
    default: [],
    validate: {
      validator: (assignedTo: Types.ObjectId[]) => assignedTo.length <= 1,
      message: 'A task can currently be assigned to only one user',
    },
  })
  assignedTo: Types.ObjectId[];

  @Prop({
    type: String,
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Prop({ default: null, type: String })
  file?: string;

  @Prop({
    type: Types.ObjectId,
    ref: ExcelFile.name,
    unique: true,
    sparse: true,
  })
  excelFile?: Types.ObjectId;

  @Prop({ default: null, type: String })
  completionFile?: string;

  @Prop({
    type: Types.ObjectId,
    ref: ExcelFile.name,
    sparse: true,
  })
  completionExcelFile?: Types.ObjectId;

  @Prop({ type: String, default: null })
  taskComment?: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({ type: Boolean, default: false })
  isPublic: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isExtraTask: boolean;

  @Prop({
    type: String,
    enum: ExtraTaskApprovalStatus,
    default: null,
    index: true,
  })
  extraTaskApprovalStatus?: ExtraTaskApprovalStatus | null;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  extraTaskApprovedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  extraTaskApprovedAt?: Date | null;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date, index: true })
  dueDate?: Date;

  @Prop({ type: Date, index: true })
  endDate?: Date;

  @Prop({ type: String, match: TIME_PATTERN })
  startTime?: string;

  @Prop({ type: String, match: TIME_PATTERN })
  endTime?: string;

  @Prop({ type: String, enum: TaskRecurrence, index: true })
  recurrence?: TaskRecurrence;

  @Prop({ type: Date })
  doneTime?: Date;

  @Prop({ type: Boolean, default: false })
  scoreAdjusted: boolean;
}

export type TaskDocument = HydratedDocument<Task>;

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.index({ recurrence: 1, startDate: 1, dueDate: 1, endDate: 1 });
