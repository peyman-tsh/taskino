import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { ProjectModule } from '../project/project.module';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule, ProjectModule, TaskModule],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}
