import { Injectable } from '@nestjs/common';
import { NotificationTemplateFactory } from '../notification-template.factory';
import { NotificationWriteService } from './notification-write.service';

@Injectable()
export class FixedTaskNotificationCommandService {
  constructor(
    private readonly writer: NotificationWriteService,
    private readonly templates: NotificationTemplateFactory,
  ) {}

  createAssigned(userId: string, fixedTaskId: string, title: string) {
    return this.writer.create(
      this.templates.fixedTaskAssigned(userId, fixedTaskId, title),
    );
  }

  createCompleted(userId: string, fixedTaskId: string, title: string) {
    return this.writer.create(
      this.templates.fixedTaskCompleted(userId, fixedTaskId, title),
    );
  }
}
