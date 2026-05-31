import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './project.schema';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }])],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}