import { Module } from '@nestjs/common';
import { ProjectModule } from '../project/project.module';
import { TaskModule } from '../task/task.module';
import { UserModule } from '../user/user.module';
import { RolesGuard } from '../user/roles.guard';
import { SupervisorController } from './supervisor.controller';
import { SupervisorService } from './supervisor.service';

@Module({
  imports: [ProjectModule, TaskModule, UserModule],
  controllers: [SupervisorController],
  providers: [SupervisorService, RolesGuard],
})
export class SupervisorModule {}
