import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './services/manager.service';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { UserProgressService } from './services/user-progress.service';
import { UserProgressCalculatorService } from './services/user-progress-calculator.service';
import { UserProgressRepository } from './repositories/user-progress.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from '../task/task.schema';
import {
  FixedTaskTemplate,
  FixedTaskTemplateSchema,
} from '../fixedTask/fixed-task.schema';
import { ManagerTasksRepository } from './repositories/manager-tasks.repository';
import { ManagerTasksService } from './services/manager-tasks.service';

@Module({
  imports: [
    UserModule,
    TaskModule,
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: FixedTaskTemplate.name, schema: FixedTaskTemplateSchema },
    ]),
  ],
  controllers: [ManagerController],
  providers: [
    ManagerService,
    UserProgressService,
    UserProgressCalculatorService,
    UserProgressRepository,
    ManagerTasksRepository,
    ManagerTasksService,
  ],
})
export class ManagerModule {}
