import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Project } from 'src/project/project.schema';
import { User } from 'src/user/schemas/user.schema';

export type ProjectMemberDocument = HydratedDocument<ProjectMember>;

export enum ProjectMemberRole {
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

@Schema({
  timestamps: true,
})
export class ProjectMember {
  @Prop({
    type: Types.ObjectId,
    ref: Project.name,
    required: true,
  })
  project: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId;

  @Prop({
    enum: ProjectMemberRole,
    default: ProjectMemberRole.MEMBER,
  })
  role: ProjectMemberRole;

  @Prop({
    default: true,
  })
  isActive: boolean;
}

export const ProjectMemberSchema =
  SchemaFactory.createForClass(ProjectMember);