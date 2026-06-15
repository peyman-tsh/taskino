import { Injectable } from '@nestjs/common';
import { WorkField } from '../../common/enums/work-field.enum';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { FixedTaskNotificationCommandService } from './fixed-task-notification-command.service';
import { GeneralNotificationCommandService } from './general-notification-command.service';
import { NotificationManagementService } from './notification-management.service';
import { NotificationWriteService } from './notification-write.service';
import { TaskNotificationCommandService } from './task-notification-command.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly writer: NotificationWriteService,
    private readonly management: NotificationManagementService,
    private readonly taskCommands: TaskNotificationCommandService,
    private readonly fixedTaskCommands: FixedTaskNotificationCommandService,
    private readonly generalCommands: GeneralNotificationCommandService,
  ) {}

  create(dto: CreateNotificationDto) {
    return this.writer.create(dto);
  }

  createBulk(dtos: CreateNotificationDto[]) {
    return this.writer.createBulk(dtos);
  }

  findOneUnread(userId: string) {
    return this.management.findOneUnread(userId);
  }

  updateMyReadStatus(userId: string, notificationId: string, isRead: boolean) {
    return this.management.updateMyReadStatus(userId, notificationId, isRead);
  }

  markAllMineAsRead(userId: string) {
    return this.management.markAllMineAsRead(userId);
  }

  deleteMine(userId: string, notificationId: string) {
    return this.management.deleteMine(userId, notificationId);
  }

  deleteMyReadNotifications(userId: string) {
    return this.management.deleteMyReadNotifications(userId);
  }

  createTaskAssignedNotification(userId: string, taskId: string, title: string) {
    return this.taskCommands.createAssigned(userId, taskId, title);
  }

  createTaskCompletedNotification(
    userId: string,
    taskId: string,
    title: string,
    completedBy: string,
  ) {
    return this.taskCommands.createCompleted(userId, taskId, title, completedBy);
  }

  updateTaskNotificationsStatus(taskId: string, title: string, status: string) {
    return this.taskCommands.updateStatus(taskId, title, status);
  }

  createFixedTaskAssignedNotification(
    userId: string,
    fixedTaskId: string,
    title: string,
  ) {
    return this.fixedTaskCommands.createAssigned(userId, fixedTaskId, title);
  }

  createFixedTaskCompletedNotification(
    userId: string,
    fixedTaskId: string,
    title: string,
  ) {
    return this.fixedTaskCommands.createCompleted(userId, fixedTaskId, title);
  }

  createLeaveRequestNotification(userId: string, title: string) {
    return this.generalCommands.createLeaveRequest(userId, title);
  }

  createLeaveApprovedNotification(userId: string, leaveType: string) {
    return this.generalCommands.createLeaveApproved(userId, leaveType);
  }

  createLeaveRejectedNotification(userId: string, leaveType: string, reason?: string) {
    return this.generalCommands.createLeaveRejected(userId, leaveType, reason);
  }

  createUserRegistrationApprovalNotifications(
    userId: string,
    firstName: string,
    lastName: string,
    workField: WorkField,
  ) {
    return this.generalCommands.createUserRegistrationApproval(
      userId,
      firstName,
      lastName,
      workField,
    );
  }

  createTaskCompletionStatsNotification(
    managerId: string,
    expertId: string,
    expertName: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ) {
    return this.generalCommands.createTaskCompletionStats(
      managerId,
      expertId,
      expertName,
      totalTasks,
      completedTasks,
      pendingTasks,
    );
  }

  createDateCountNotification(
    userId: string,
    startDate: string,
    endDate: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ) {
    return this.generalCommands.createDateCount(
      userId,
      startDate,
      endDate,
      totalTasks,
      completedTasks,
      pendingTasks,
    );
  }
}
