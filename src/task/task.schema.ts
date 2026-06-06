import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../user/schemas/user.schema';
import { Project } from 'src/project/project.schema';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  // 👇 کسی که تسک رو ساخته (Manager)
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  // 👇 کسانی که تسک بهشون داده شده (Specialist / Supervisor)
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
  type: Types.ObjectId,
  ref: Project.name
})
projectId: Types.ObjectId;

  @Prop({
    type: String,
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Prop({ type: Types.ObjectId, ref: 'FixedTaskTemplate', index: true })
  fixedTaskTemplateId?: Types.ObjectId;
  

  @Prop({default:null,type:String})
  file?:string;

  @Prop({type:String,default:null})
  taskComment?:string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({type:Boolean,default:false})
  isPublic:boolean;

  @Prop({ type:String, default: null })
  startDate: string;

  @Prop({ type:String, default: null})
  dueDate: string;
}

export type TaskDocument = HydratedDocument<Task>;

export const TaskSchema = SchemaFactory.createForClass(Task);
