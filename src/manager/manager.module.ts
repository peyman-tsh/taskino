import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './services/manager.service';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { UserProgressService } from './services/user-progress.service';
import { UserProgressCalculatorService } from './services/user-progress-calculator.service';
import { UserProgressRepositoryService } from './services/user-progress-repository.service';

@Module({
  imports: [UserModule, TaskModule],
  controllers: [ManagerController],
  providers: [
    ManagerService,
    UserProgressService,
    UserProgressCalculatorService,
    UserProgressRepositoryService,
  ],
})
export class ManagerModule {}
