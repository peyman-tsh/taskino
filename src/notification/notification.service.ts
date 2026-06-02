import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { Notification, NotificationDocument, NotificationType } from './notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Create a new notification
   */
  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    if (!Types.ObjectId.isValid(createNotificationDto.user)) {
      throw new BadRequestException('Invalid user ID');
    }

    const notification = new this.notificationModel({
      ...createNotificationDto,
      user: new Types.ObjectId(createNotificationDto.user),
    });

    return notification.save();
  }

  /**
   * Create bulk notifications
   */
  async createBulk(notifications: CreateNotificationDto[]): Promise<NotificationDocument[]> {
    const validNotifications = notifications.filter((notif) => Types.ObjectId.isValid(notif.user));

    if (validNotifications.length !== notifications.length) {
      throw new BadRequestException('One or more user IDs are invalid');
    }

    const notificationDocs = validNotifications.map((notif) => {
      return new this.notificationModel({
        ...notif,
        user: new Types.ObjectId(notif.user),
      });
    });

    return this.notificationModel.insertMany(notificationDocs);
  }

  /**
   * Create a notification for task assignment
   */
  async createTaskAssignedNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
  ): Promise<NotificationDocument> {
    return this.create({
      user: userId,
      title: 'Task Assigned',
      message: `You have been assigned to the task: ${taskTitle}`,
      type: NotificationType.TASK_ASSIGNED,
      link: `/tasks/${taskId}`,
    });
  }

  /**
   * Create a notification for task completion
   */
  async createTaskCompletedNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    completedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      user: userId,
      title: 'Task Completed',
      message: `The task "${taskTitle}" has been completed by ${completedBy}`,
      type: NotificationType.TASK_COMPLETED,
      link: `/tasks/${taskId}`,
    });
  }

  /**
   * Create a notification for leave request
   */
  async createLeaveRequestNotification(
    userId: string,
    requestTitle: string,
  ): Promise<NotificationDocument> {
    return this.create({
      user: userId,
      title: 'Leave Request',
      message: `A new leave request has been submitted: ${requestTitle}`,
      type: NotificationType.LEAVE_REQUEST,
    });
  }

  /**
   * Create a notification for leave approved
   */
  async createLeaveApprovedNotification(
    userId: string,
    leaveType: string,
  ): Promise<NotificationDocument> {
    return this.create({
      user: userId,
      title: 'Leave Approved',
      message: `Your ${leaveType} leave request has been approved`,
      type: NotificationType.LEAVE_APPROVED,
    });
  }

  /**
   * Create a notification for leave rejected
   */
  async createLeaveRejectedNotification(
    userId: string,
    leaveType: string,
    reason?: string,
  ): Promise<NotificationDocument> {
    return this.create({
      user: userId,
      title: 'Leave Rejected',
      message: reason
        ? `Your ${leaveType} leave request has been rejected. Reason: ${reason}`
        : `Your ${leaveType} leave request has been rejected`,
      type: NotificationType.LEAVE_REJECTED,
    });
  }

  /**
   * Create a notification for project member added
   */
  async createProjectMemberAddedNotification(
    userId: string,
    projectName: string,
  ): Promise<NotificationDocument> {
    return this.create({
      user: userId,
      title: 'Project Member',
      message: `You have been added to the project: ${projectName}`,
      type: NotificationType.PROJECT_MEMBER_ADDED,
    });
  }

  /**
   * Create a notification for task completion statistics
   * Notifies a manager about the completion stats of tasks assigned to an expert
   */
  async createTaskCompletionStatsNotification(
    managerId: string,
    expertId: string,
    expertName: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ): Promise<NotificationDocument> {
    return this.create({
      user: managerId,
      title: 'Task Completion Statistics',
      message: `Expert ${expertName}: ${completedTasks}/${totalTasks} tasks completed, ${pendingTasks} pending`,
      type: NotificationType.TASK_COMPLETION_STATS,
      link: `/tasks/stats?managerId=${managerId}&expertId=${expertId}`,
    });
  }

  /**
   * Create a notification for date count
   * Notifies about task count within a date range for a user in a project
   */
  async createDateCountNotification(
    userId: string,
    projectId: string,
    startDate: string,
    endDate: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ): Promise<NotificationDocument> {
    return this.create({
      user: userId,
      title: 'Date Count Summary',
      message: `From ${startDate} to ${endDate}: ${completedTasks}/${totalTasks} tasks completed, ${pendingTasks} pending`,
      type: NotificationType.DATE_COUNT,
      link: `/projects/${projectId}/tasks?start=${startDate}&end=${endDate}`,
    });
  }

  /**
   * Find all notifications with pagination and filters
   */
  async findAll(
    queryDto?: QueryNotificationDto,
  ): Promise<{
    data: NotificationDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 10;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    // Filter by type
    if (queryDto?.type) {
      query.type = queryDto.type;
    }

    // Filter by read status
    if (queryDto?.isRead !== undefined) {
      const isRead = queryDto.isRead === 'true';
      query.isRead = isRead;
    }

    // Search in title or message
    if (queryDto?.search) {
      query.$or = [
        { title: { $regex: queryDto.search, $options: 'i' } },
        { message: { $regex: queryDto.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('user', 'firstName lastName email')
        .exec(),
      this.notificationModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find notifications by user ID
   */
  async findByUserId(
    userId: string,
    queryDto?: QueryNotificationDto,
  ): Promise<{
    data: NotificationDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 10;
    const skip = (page - 1) * limit;

    const baseQuery: Record<string, unknown> = { user: new Types.ObjectId(userId) };

    // Additional filters
    if (queryDto?.type) {
      baseQuery.type = queryDto.type;
    }

    if (queryDto?.isRead !== undefined) {
      const isRead = queryDto.isRead === 'true';
      baseQuery.isRead = isRead;
    }

    if (queryDto?.search) {
      baseQuery.$or = [
        { title: { $regex: queryDto.search, $options: 'i' } },
        { message: { $regex: queryDto.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(baseQuery)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('user', 'firstName lastName email')
        .exec(),
      this.notificationModel.countDocuments(baseQuery).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find unread notifications count for a user
   */
  async getUnreadCountByUserId(userId: string): Promise<{ unreadCount: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const unreadCount = await this.notificationModel
      .countDocuments({
        user: new Types.ObjectId(userId),
        isRead: false,
      })
      .exec();

    return { unreadCount };
  }

  /**
   * Find notifications by user ID and read status
   */
  async findByUserIdAndReadStatus(
    userId: string,
    isRead: boolean,
  ): Promise<NotificationDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.notificationModel
      .find({
        user: new Types.ObjectId(userId),
        isRead,
      })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email')
      .exec();
  }

  /**
   * Find a notification by ID
   */
  async findById(id: string): Promise<NotificationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel
      .findById(id)
      .populate('user', 'firstName lastName email')
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Update a notification by ID
   */
  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<NotificationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel.findById(id).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateNotificationDto.user !== undefined) {
      if (!Types.ObjectId.isValid(updateNotificationDto.user)) {
        throw new BadRequestException('Invalid user ID');
      }
      updateData.user = new Types.ObjectId(updateNotificationDto.user);
    }

    if (updateNotificationDto.title !== undefined) {
      updateData.title = updateNotificationDto.title;
    }

    if (updateNotificationDto.message !== undefined) {
      updateData.message = updateNotificationDto.message;
    }

    if (updateNotificationDto.type !== undefined) {
      updateData.type = updateNotificationDto.type;
    }

    if (updateNotificationDto.isRead !== undefined) {
      updateData.isRead = updateNotificationDto.isRead;
    }

    if (updateNotificationDto.link !== undefined) {
      updateData.link = updateNotificationDto.link;
    }

    const updatedNotification = await this.notificationModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('user', 'firstName lastName email')
      .exec();

    if (!updatedNotification) {
      throw new NotFoundException('Notification not found');
    }

    return updatedNotification;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<NotificationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel.findById(id).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updatedNotification = await this.notificationModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .populate('user', 'firstName lastName email')
      .exec();

    return updatedNotification!;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.notificationModel.updateMany(
      { user: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );

    return { modifiedCount: result.modifiedCount || 0 };
  }

  /**
   * Delete a notification by ID
   */
  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel.findByIdAndDelete(id).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteReadNotifications(userId: string): Promise<{ deletedCount: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.notificationModel.deleteMany({
      user: new Types.ObjectId(userId),
      isRead: true,
    });

    return { deletedCount: result.deletedCount || 0 };
  }
}