import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskController } from './task.controller';
import { TaskService } from './services/task.service';
import { Task, TaskSchema } from './task.schema';
import { ExcelModule } from '../excel/excel.module';
import { UserModule } from 'src/user/user.module';
import { TaskNotificationService } from './services/task-notification.service';
import { TaskPolicyService } from './services/task-policy.service';
import { TaskReportService } from './services/task-report.service';
import { TaskScoreService } from './services/task-score.service';
import { TaskRepository } from './repositories/task.repository';
import { TaskQueryService } from './services/task-query.service';
import { TaskUpdateService } from './services/task-update.service';
import { SpecialistTaskQueryService } from './services/specialist-task-query.service';
import { TaskCreationService } from './services/task-creation.service';
import { TaskOverdueScoreCronService } from './services/task-overdue-score-cron.service';

@Module({
  imports: [
    UserModule,
    ExcelModule,
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
  ],
  controllers: [TaskController],
  providers: [
    TaskService,
    TaskPolicyService,
    TaskNotificationService,
    TaskScoreService,
    TaskReportService,
    TaskRepository,
    TaskQueryService,
    TaskUpdateService,
    SpecialistTaskQueryService,
    TaskCreationService,
    TaskOverdueScoreCronService,
  ],
  exports: [TaskService, TaskReportService],
})
export class TaskModule {}
