import { Injectable } from '@nestjs/common';
import { WorkField } from '../../common/enums/work-field.enum';
import { UserService } from '../../user/services/user.service';
import { NotificationDocument } from '../notification.schema';
import { NotificationTemplateFactory } from '../notification-template.factory';
import { NotificationWriteService } from './notification-write.service';

@Injectable()
export class GeneralNotificationCommandService {
  constructor(
    private readonly writer: NotificationWriteService,
    private readonly userService: UserService,
    private readonly templates: NotificationTemplateFactory,
  ) {}

  createLeaveRequest(userId: string, title: string) {
    return this.writer.create(this.templates.leaveRequest(userId, title));
  }

  async createLeaveRequestForManagersAndSupervisors(
    workField: WorkField,
    requesterName: string,
  ): Promise<NotificationDocument[]> {
    const recipientIds =
      await this.userService.findActiveManagerAndSupervisorIdsByWorkField(
        workField,
      );
    if (recipientIds.length === 0) return [];

    return this.writer.createBulk(
      recipientIds.map((userId) =>
        this.templates.leaveRequest(userId, requesterName),
      ),
    );
  }

  createLeaveApproved(userId: string, leaveType: string) {
    return this.writer.create(this.templates.leaveApproved(userId, leaveType));
  }

  createLeaveRejected(userId: string, leaveType: string, reason?: string) {
    return this.writer.create(
      this.templates.leaveRejected(userId, leaveType, reason),
    );
  }

  async createUserRegistrationApproval(
    userId: string,
    firstName: string,
    lastName: string,
    workField: WorkField,
  ): Promise<NotificationDocument[]> {
    const managerIds =
      await this.userService.findActiveManagerIdsByWorkField(workField);
    if (managerIds.length === 0) return [];

    const fullName = `${firstName} ${lastName}`.trim();
    return this.writer.createBulk(
      managerIds.map((managerId) =>
        this.templates.userRegistrationApproval(managerId, userId, fullName),
      ),
    );
  }

  createTaskCompletionStats(
    managerId: string,
    expertId: string,
    expertName: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ) {
    return this.writer.create(
      this.templates.taskCompletionStats(
        managerId,
        expertId,
        expertName,
        totalTasks,
        completedTasks,
        pendingTasks,
      ),
    );
  }

  createDateCount(
    userId: string,
    startDate: string,
    endDate: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ) {
    return this.writer.create(
      this.templates.dateCount(
        userId,
        startDate,
        endDate,
        totalTasks,
        completedTasks,
        pendingTasks,
      ),
    );
  }
}
