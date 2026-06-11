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

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: FixedTaskTemplate.name, schema: FixedTaskTemplateSchema },
    ]),
  ],
  controllers: [FixedTaskController],
  providers: [FixedTaskService, FixedTaskPolicyService],
  exports: [FixedTaskService],
})
export class FixedTaskModule {}
