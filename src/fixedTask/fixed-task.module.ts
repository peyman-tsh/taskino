import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FixedTaskTemplate,
  FixedTaskTemplateSchema,
} from './fixed-task.schema';
import { FixedTaskService } from './fixed-task.service';
import { UserModule } from '../user/user.module';
import { FixedTaskController } from './fixed-task.controller';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: FixedTaskTemplate.name, schema: FixedTaskTemplateSchema },
    ]),
  ],
  controllers: [FixedTaskController],
  providers: [FixedTaskService],
  exports: [FixedTaskService],
})
export class FixedTaskModule {}
