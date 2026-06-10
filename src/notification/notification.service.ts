import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserService } from '../user/user.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification, NotificationDocument } from './notification.schema';
import { NotificationTemplateFactory } from './notification-template.factory';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly userService: UserService,
    private readonly templateFactory: NotificationTemplateFactory,
  ) {}

  async create(
    notificationDto: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    const userId = this.toObjectId(notificationDto.user, 'user ID');
    await this.userService.findById(notificationDto.user);

    return new this.notificationModel({
      ...notificationDto,
      user: userId,
    }).save();
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

    const notificationDocuments = notifications.map(
      (notification) =>
        new this.notificationModel({
          ...notification,
          user: this.toObjectId(notification.user, 'user ID'),
          isRead: notification.isRead ?? false,
        }),
    );

    return this.notificationModel.insertMany(notificationDocuments);
  }


  async findUnReadById(userId: string) {
    const notification = await this.notificationModel
      .findOne({
        user: this.toObjectId(userId, 'user ID'),
        isRead: false,
      })
      .exec();

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
    const notification = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: this.toObjectId(notificationId, 'notification ID'),
          user: this.toObjectId(userId, 'user ID'),
        },
        { isRead },
        { new: true },
      )
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllMineAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      {
        user: this.toObjectId(userId, 'user ID'),
        isRead: false,
      },
      { isRead: true },
    );

    return { modifiedCount: result.modifiedCount };
  }

  async deleteMine(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationModel
      .findOneAndDelete({
        _id: this.toObjectId(notificationId, 'notification ID'),
        user: this.toObjectId(userId, 'user ID'),
      })
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
  }

  async deleteMyReadNotifications(
    userId: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.notificationModel.deleteMany({
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
