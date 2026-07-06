import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User, UserPerformanceStatus } from './user.schema';

export type UserDailyProgressDocument = HydratedDocument<UserDailyProgress>;

@Schema({ timestamps: true })
export class UserDailyProgress {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ type: Number, default: 0, min: 0 })
  totalTasks: number;

  @Prop({ type: Number, default: 0, min: 0 })
  completedTasks: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalFixedTasks: number;

  @Prop({ type: Number, default: 0, min: 0 })
  completedFixedTasks: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  taskProgressPercentage: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  fixedTaskProgressPercentage: number;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progressPercentage: number;

  @Prop({
    type: String,
    enum: UserPerformanceStatus,
    default: UserPerformanceStatus.WEAK,
  })
  performanceStatus: UserPerformanceStatus;

  @Prop({ type: Date, required: true })
  evaluatedAt: Date;
}

export const UserDailyProgressSchema =
  SchemaFactory.createForClass(UserDailyProgress);

UserDailyProgressSchema.index({ userId: 1, date: 1 }, { unique: true });
