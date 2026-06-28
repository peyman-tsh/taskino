import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FixedTaskTemplate,
  FixedTaskTemplateSchema,
} from '../fixedTask/fixed-task.schema';
import { Task, TaskSchema } from '../task/task.schema';
import { SupervisorStatisticsService } from './services/supervisor-statistics.service';
import { SupervisorWorkRepository } from './repositories/supervisor-work.repository';
import { SupervisorService } from './services/supervisor.service';
import { SupervisorPolicyService } from './services/supervisor-policy.service';
import { SupervisorController } from './supervisor.controller';
import { User, UserSchema } from '../user/schemas/user.schema';
import { SupervisorMemberRepository } from './repositories/supervisor-member.repository';
import { SupervisorMemberService } from './services/supervisor-member.service';
import { SupervisorStatisticsRepository } from './repositories/supervisor-statistics.repository';
import { SupervisorWorkService } from './services/supervisor-work.service';
import { SupervisorMemberWorkRepository } from './repositories/supervisor-member-work.repository';
import { TaskModule } from '../task/task.module';

@Module({
  imports: [
    TaskModule,
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: FixedTaskTemplate.name, schema: FixedTaskTemplateSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SupervisorController],
  providers: [
    SupervisorService,
    SupervisorStatisticsService,
    SupervisorPolicyService,
    SupervisorWorkRepository,
    SupervisorMemberRepository,
    SupervisorMemberService,
    SupervisorStatisticsRepository,
    SupervisorWorkService,
    SupervisorMemberWorkRepository,
  ],
})
export class SupervisorModule {}
