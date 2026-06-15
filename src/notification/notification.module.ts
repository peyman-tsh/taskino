import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './services/notification.service';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationQueryService } from './services/notification-query.service';
import { NotificationTemplateFactory } from './notification-template.factory';
import { UserModule } from '../user/user.module';
import { NotificationEventListener } from './notification-event.listener';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationPolicyService } from './services/notification-policy.service';
import { NotificationWriteService } from './services/notification-write.service';
import { NotificationManagementService } from './services/notification-management.service';
import { TaskNotificationCommandService } from './services/task-notification-command.service';
import { FixedTaskNotificationCommandService } from './services/fixed-task-notification-command.service';
import { GeneralNotificationCommandService } from './services/general-notification-command.service';
import { NotificationQueryFilterBuilder } from './services/notification-query-filter.builder';
import { TaskNotificationTemplateFactory } from './factories/task-notification-template.factory';
import { FixedTaskNotificationTemplateFactory } from './factories/fixed-task-notification-template.factory';
import { GeneralNotificationTemplateFactory } from './factories/general-notification-template.factory';
import { TaskNotificationEventHandler } from './handlers/task-notification-event.handler';
import { FixedTaskNotificationEventHandler } from './handlers/fixed-task-notification-event.handler';
import { UserNotificationEventHandler } from './handlers/user-notification-event.handler';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationQueryService,
    NotificationTemplateFactory,
    NotificationEventListener,
    NotificationRepository,
    NotificationPolicyService,
    NotificationWriteService,
    NotificationManagementService,
    TaskNotificationCommandService,
    FixedTaskNotificationCommandService,
    GeneralNotificationCommandService,
    NotificationQueryFilterBuilder,
    TaskNotificationTemplateFactory,
    FixedTaskNotificationTemplateFactory,
    GeneralNotificationTemplateFactory,
    TaskNotificationEventHandler,
    FixedTaskNotificationEventHandler,
    UserNotificationEventHandler,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
