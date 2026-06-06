import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationQueryService } from './notification-query.service';
import { NotificationTemplateFactory } from './notification-template.factory';
import { UserModule } from '../user/user.module';
import { NotificationEventListener } from './notification-event.listener';

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
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
