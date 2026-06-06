import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { WorkField } from '../../common/enums/work-field.enum';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  SPECIALIST = 'specialist',
  SUPERVISOR = 'supervisor',
  MANAGER = 'manager',
}
@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc: any, ret: any) => {
      delete ret.password;
      delete ret.__v;
      return ret;
    },
  },
})
export class User {
  @Prop({ type: String, required: true, trim: true })
  firstName: string;

  @Prop({ type: String, required: true, trim: true })
  lastName: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, trim: true })
  mobile?: string;

  @Prop({ type: String, required: true, select: false })
  password: string;

  @Prop({
    type: String,
    default: UserRole.SPECIALIST,
  })
  roles: string;

  @Prop({
    type: String,
    enum: WorkField,
    required: true,
    index: true,
  })
  workField: WorkField;

  @Prop({type:Number,required:false})
  score:number;
  
  @Prop({type:Boolean,default:false})
  isActive:boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;


}

export const UserSchema = SchemaFactory.createForClass(User);
