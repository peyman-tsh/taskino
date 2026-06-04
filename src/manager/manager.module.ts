import { Module } from '@nestjs/common';
import { ManagerController } from './manager.controller';
import { ManagerService } from './manager.service';
import { ProjectModule } from '../project/project.module';
import { ProjectMemberModule } from '../projectMember/projectMember.module';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule, ProjectModule, TaskModule, ProjectMemberModule],
  controllers: [ManagerController],
  providers: [ManagerService],
})
export class ManagerModule {}
