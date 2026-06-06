import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectMember, ProjectMemberSchema } from './member.schema';
import { ProjectMemberController } from './projectMember.controller';
import { ProjectMemberService } from './projectMember.service';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    ProjectModule,
    MongooseModule.forFeature([{ name: ProjectMember.name, schema: ProjectMemberSchema }]),
  ],
  controllers: [ProjectMemberController],
  providers: [ProjectMemberService],
  exports: [ProjectMemberService],
})
export class ProjectMemberModule {}
