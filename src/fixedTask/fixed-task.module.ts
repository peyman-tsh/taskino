import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FixedTaskTemplate,
  FixedTaskTemplateSchema,
} from './fixed-task.schema';
import { FixedTaskService } from './fixed-task.service';
import { UserModule } from '../user/user.module';
import { ProjectModule } from '../project/project.module';
import { FixedTaskController } from './fixed-task.controller';
import { Task, TaskSchema } from '../task/task.schema';
import { FixedTaskReportService } from './fixed-task-report.service';

@Module({
  imports: [
    UserModule,
    ProjectModule,
    MongooseModule.forFeature([
      { name: FixedTaskTemplate.name, schema: FixedTaskTemplateSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
  ],
  controllers: [FixedTaskController],
  providers: [FixedTaskService, FixedTaskReportService],
  exports: [FixedTaskService, FixedTaskReportService],
})
export class FixedTaskModule {}
