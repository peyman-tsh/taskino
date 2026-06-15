import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserService } from '../../user/services/user.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import {
  NotificationDocument,
  NotificationEntityType,
} from '../notification.schema';
import { NotificationTemplateFactory } from '../notification-template.factory';
import { NotificationRepository } from '../repositories/notification.repository';
import { WorkField } from '../../common/enums/work-field.enum';

@Injectable()
export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly userService: UserService,
    private readonly templateFactory: NotificationTemplateFactory,
  ) {}

  async create(
    notificationDto: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    const userId = this.toObjectId(notificationDto.user, 'user ID');
    const entityId = notificationDto.entityId
      ? this.toObjectId(notificationDto.entityId, 'entity ID')
      : undefined;
    await this.userService.findById(notificationDto.user);

    return this.repository.create(notificationDto, userId, entityId);
  }

  async createBulk(
    notifications: CreateNotificationDto[],
  ): Promise<NotificationDocument[]> {
    const uniqueUserIds = [
      ...new Set(notifications.map((notification) => notification.user)),
    ];
    await Promise.all(
      uniqueUserIds.map((userId) => this.userService.findById(userId)),
    );

    return this.repository.createBulk(
      notifications.map((notification) => ({
        ...notification,
        user: this.toObjectId(notification.user, 'user ID'),
        entityId: notification.entityId
          ? this.toObjectId(notification.entityId, 'entity ID')
          : undefined,
        isRead: notification.isRead ?? false,
      })),
    );
  }


  async findOneUnread(userId: string) {
    const notification = await this.repository.findOne({
        user: this.toObjectId(userId, 'user ID'),
        isRead: false,
      });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async updateMyReadStatus(
    userId: string,
    notificationId: string,
    isRead: boolean,
  ): Promise<NotificationDocument> {
    const notification = await this.repository.findOneAndUpdate(
        {
          _id: this.toObjectId(notificationId, 'notification ID'),
          user: this.toObjectId(userId, 'user ID'),
        },
        { isRead },
      );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllMineAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.repository.updateMany(
      {
        user: this.toObjectId(userId, 'user ID'),
        isRead: false,
      },
      { isRead: true },
    );

    return { modifiedCount: result.modifiedCount };
  }

  async deleteMine(userId: string, notificationId: string): Promise<void> {
    const notification = await this.repository.findOneAndDelete({
        _id: this.toObjectId(notificationId, 'notification ID'),
        user: this.toObjectId(userId, 'user ID'),
      });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
  }

  async deleteMyReadNotifications(
    userId: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.repository.deleteMany({
      user: this.toObjectId(userId, 'user ID'),
      isRead: true,
    });

    return { deletedCount: result.deletedCount };
  }

  createTaskAssignedNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
  ) {
    return this.create(
      this.templateFactory.taskAssigned(userId, taskId, taskTitle),
    );
  }

  createTaskCompletedNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    completedBy: string,
  ) {
    return this.create(
      this.templateFactory.taskCompleted(
        userId,
        taskId,
        taskTitle,
        completedBy,
      ),
    );
  }

  updateTaskNotificationsStatus(
    taskId: string,
    taskTitle: string,
    status: string,
  ) {
    const entityId = this.toObjectId(taskId, 'task ID');

    return this.repository.updateMany(
      {
        $or: [
          { entityType: NotificationEntityType.TASK, entityId },
          { link: `/tasks/${taskId}` },
        ],
      },
      this.templateFactory.taskStatusChanged(taskTitle, status),
    );
  }

  createFixedTaskAssignedNotification(
    userId: string,
    fixedTaskId: string,
    fixedTaskTitle: string,
  ) {
    return this.create(
      this.templateFactory.fixedTaskAssigned(userId, fixedTaskId, fixedTaskTitle),
    );
  }

  createFixedTaskCompletedNotification(
    userId: string,
    fixedTaskId: string,
    fixedTaskTitle: string,
  ) {
    return this.create(
      this.templateFactory.fixedTaskCompleted(
        userId,
        fixedTaskId,
        fixedTaskTitle,
      ),
    );
  }

  createLeaveRequestNotification(userId: string, requestTitle: string) {
    return this.create(this.templateFactory.leaveRequest(userId, requestTitle));
  }

  createLeaveApprovedNotification(userId: string, leaveType: string) {
    return this.create(this.templateFactory.leaveApproved(userId, leaveType));
  }

  createLeaveRejectedNotification(
    userId: string,
    leaveType: string,
    reason?: string,
  ) {
    return this.create(
      this.templateFactory.leaveRejected(userId, leaveType, reason),
    );
  }

  async createUserRegistrationApprovalNotifications(
    userId: string,
    firstName: string,
    lastName: string,
    workField: WorkField,
  ): Promise<NotificationDocument[]> {
    const managerIds =
      await this.userService.findActiveManagerIdsByWorkField(workField);
    if (managerIds.length === 0) {
      return [];
    }

    const fullName = `${firstName} ${lastName}`.trim();
    return this.createBulk(
      managerIds.map((managerId) =>
        this.templateFactory.userRegistrationApproval(
          managerId,
          userId,
          fullName,
        ),
      ),
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
    return this.create(
      this.templateFactory.taskCompletionStats(
        managerId,
        expertId,
        expertName,
        totalTasks,
        completedTasks,
        pendingTasks,
      ),
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
    return this.create(
      this.templateFactory.dateCount(
        userId,
        startDate,
        endDate,
        totalTasks,
        completedTasks,
        pendingTasks,
      ),
    );
  }

  private toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return new Types.ObjectId(id);
  }
}
