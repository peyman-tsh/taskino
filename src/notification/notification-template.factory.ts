import { Injectable } from '@nestjs/common';
import { FixedTaskNotificationTemplateFactory } from './factories/fixed-task-notification-template.factory';
import { GeneralNotificationTemplateFactory } from './factories/general-notification-template.factory';
import { TaskNotificationTemplateFactory } from './factories/task-notification-template.factory';

@Injectable()
export class NotificationTemplateFactory {
  constructor(
    private readonly taskTemplates: TaskNotificationTemplateFactory,
    private readonly fixedTaskTemplates: FixedTaskNotificationTemplateFactory,
    private readonly generalTemplates: GeneralNotificationTemplateFactory,
  ) {}

  taskAssigned(userId: string, taskId: string, title: string) {
    return this.taskTemplates.assigned(userId, taskId, title);
  }

  taskCompleted(userId: string, taskId: string, title: string, completedBy: string) {
    return this.taskTemplates.completed(userId, taskId, title, completedBy);
  }

  taskStatusChanged(title: string, status: string) {
    return this.taskTemplates.statusChanged(title, status);
  }

  fixedTaskAssigned(userId: string, fixedTaskId: string, title: string) {
    return this.fixedTaskTemplates.assigned(userId, fixedTaskId, title);
  }

  fixedTaskCompleted(userId: string, fixedTaskId: string, title: string) {
    return this.fixedTaskTemplates.completed(userId, fixedTaskId, title);
  }

  leaveRequest(userId: string, title: string) {
    return this.generalTemplates.leaveRequest(userId, title);
  }

  leaveApproved(userId: string, leaveType: string) {
    return this.generalTemplates.leaveApproved(userId, leaveType);
  }

  leaveRejected(userId: string, leaveType: string, reason?: string) {
    return this.generalTemplates.leaveRejected(userId, leaveType, reason);
  }

  userRegistrationApproval(managerId: string, userId: string, fullName: string) {
    return this.generalTemplates.userRegistrationApproval(managerId, userId, fullName);
  }

  taskCompletionStats(
    managerId: string,
    expertId: string,
    expertName: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ) {
    return this.generalTemplates.taskCompletionStats(
      managerId,
      expertId,
      expertName,
      totalTasks,
      completedTasks,
      pendingTasks,
    );
  }

  dateCount(
    userId: string,
    startDate: string,
    endDate: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ) {
    return this.generalTemplates.dateCount(
      userId,
      startDate,
      endDate,
      totalTasks,
      completedTasks,
      pendingTasks,
    );
  }
}
