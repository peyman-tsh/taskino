import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Task } from 'src/task/task.schema';
import { User } from 'src/user/schemas/user.schema';
import { WorkField } from '../common/enums/work-field.enum';

export type ProjectDocument = HydratedDocument<Project>;

export enum ProjectStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Schema({
  timestamps: true,
})
export class Project {
  @Prop({
    required: true,
    trim: true,
  })
  title: string;

  @Prop({
    default: '',
  })
  description: string;

  @Prop({
    enum: ProjectStatus,
    default: ProjectStatus.PENDING,
  })
  status: ProjectStatus;

  @Prop({
    type: String,
    enum: WorkField,
    required: true,
    index: true,
  })
  workField: WorkField;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  owner: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  supervisorId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    index: true,
  })
  assigneeId?: Types.ObjectId;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({
    default: false,
  })
  isArchived: boolean;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Task' }],
    default: [],
  })
  tasks: Types.ObjectId[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
