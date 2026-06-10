import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule, TaskModule],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}
