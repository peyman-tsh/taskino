import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';

export enum FixedTaskRecurrence {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Schema({ timestamps: true })
export class FixedTaskTemplate {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId;

  @Prop({ type: String, enum: FixedTaskRecurrence, required: true, index: true })
  recurrence: FixedTaskRecurrence;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastGeneratedAt?: Date;

  @Prop({ type: Date })
  nextRunAt?: Date;

  @Prop({ type: String })
  sourceExcel?: string;

  @Prop({ type: String })
  sourceSheet?: string;

  @Prop({ type: Number })
  sourceRow?: number;
}

export type FixedTaskTemplateDocument = HydratedDocument<FixedTaskTemplate>;

export const FixedTaskTemplateSchema = SchemaFactory.createForClass(FixedTaskTemplate);

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
