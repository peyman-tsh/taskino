import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Project } from '../project/project.schema';
import { User } from '../user/schemas/user.schema';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: User.name }],
    required: true,
    validate: {
      validator: (assignedTo: Types.ObjectId[]) => assignedTo.length === 1,
      message: 'A task must be assigned to exactly one user',
    },
  })
  assignedTo: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: Project.name })
  projectId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Prop({ type: Types.ObjectId, ref: 'FixedTaskTemplate', index: true })
  fixedTaskTemplateId?: Types.ObjectId;

  @Prop({ default: null, type: String })
  file?: string;

  @Prop({ type: String, default: null })
  taskComment?: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({ type: Boolean, default: false })
  isPublic: boolean;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date, index: true })
  dueDate?: Date;
}

export type TaskDocument = HydratedDocument<Task>;

export const TaskSchema = SchemaFactory.createForClass(Task);
