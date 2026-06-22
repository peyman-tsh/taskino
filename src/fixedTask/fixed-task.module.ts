import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FixedTaskTemplate,
  FixedTaskTemplateSchema,
} from './fixed-task.schema';
import { FixedTaskService } from './services/fixed-task.service';
import { UserModule } from '../user/user.module';
import { FixedTaskController } from './fixed-task.controller';
import { FixedTaskPolicyService } from './services/fixed-task-policy.service';
import { FixedTaskRepository } from './repositories/fixed-task.repository';
import { FixedTaskSeedRepository } from './repositories/fixed-task-seed.repository';
import { FixedTaskSeedService } from './services/fixed-task-seed.service';
import { FixedTaskScoreService } from './services/fixed-task-score.service';
import { SpecialistFixedTaskQueryService } from './services/specialist-fixed-task-query.service';
import { FixedTaskNotificationService } from './services/fixed-task-notification.service';
import { FixedTaskCreationService } from './services/fixed-task-creation.service';
import { FixedTaskQueryService } from './services/fixed-task-query.service';
import { FixedTaskUpdateService } from './services/fixed-task-update.service';
import { FixedTaskDeleteService } from './services/fixed-task-delete.service';
import { FixedTaskDeadlineService } from './services/fixed-task-deadline.service';
import { FixedTaskRolloverService } from './services/fixed-task-rollover.service';
import { FixedTaskTimingService } from './services/fixed-task-timing.service';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: FixedTaskTemplate.name, schema: FixedTaskTemplateSchema },
    ]),
  ],
  controllers: [FixedTaskController],
  providers: [
    FixedTaskService,
    FixedTaskPolicyService,
    FixedTaskRepository,
    FixedTaskSeedRepository,
    FixedTaskSeedService,
    FixedTaskScoreService,
    SpecialistFixedTaskQueryService,
    FixedTaskNotificationService,
    FixedTaskCreationService,
    FixedTaskQueryService,
    FixedTaskUpdateService,
    FixedTaskDeleteService,
    FixedTaskDeadlineService,
    FixedTaskRolloverService,
    FixedTaskTimingService,
  ],
  exports: [FixedTaskService],
})
export class FixedTaskModule {}
