import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './project.schema';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TaskModule } from 'src/task/task.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => TaskModule), UserModule, MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }])],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
