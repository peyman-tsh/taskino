import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { Notification, NotificationType } from './notification.schema';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create bulk notifications' })
  @ApiResponse({ status: 201, description: 'Notifications created successfully' })
  createBulk(@Body() notifications: CreateNotificationDto[]) {
    return this.notificationService.createBulk(notifications);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  findAll(@Query() queryDto: QueryNotificationDto) {
    return this.notificationService.findAll(queryDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications by user ID' })
  @ApiParam({ name: 'userId', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  findByUserId(@Param('userId') userId: string, @Query() queryDto: QueryNotificationDto) {
    return this.notificationService.findByUserId(userId, queryDto);
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: 'Get unread notifications count for a user' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  getUnreadCount(@Param('userId') userId: string) {
    return this.notificationService.getUnreadCountByUserId(userId);
  }

  @Get('user/:userId/unread')
  @ApiOperation({ summary: 'Get unread notifications for a user' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Unread notifications retrieved successfully' })
  findUnreadByUserId(@Param('userId') userId: string) {
    return this.notificationService.findByUserIdAndReadStatus(userId, false);
  }

  @Get('user/:userId/read')
  @ApiOperation({ summary: 'Get read notifications for a user' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Read notifications retrieved successfully' })
  findReadByUserId(@Param('userId') userId: string) {
    return this.notificationService.findByUserIdAndReadStatus(userId, true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  findById(@Param('id') id: string) {
    return this.notificationService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a notification by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: 'Notification updated successfully' })
  update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: 'Notification marked as read successfully' })
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('user/:userId/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'All notifications marked as read successfully' })
  markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  delete(@Param('id') id: string) {
    return this.notificationService.delete(id);
  }

  @Post('user/:userId/delete-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all read notifications for a user' })
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Read notifications deleted successfully' })
  deleteReadNotifications(@Param('userId') userId: string) {
    return this.notificationService.deleteReadNotifications(userId);
  }

  @Post('task-completion-stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create task completion statistics notification',
    description: 'Creates a notification for a manager about task completion stats assigned to an expert',
  })
  @ApiResponse({ status: 201, description: 'Task completion statistics notification created successfully' })
  createTaskCompletionStatsNotification(
    @Body('managerId') managerId: string,
    @Body('expertId') expertId: string,
    @Body('expertName') expertName: string,
    @Body('totalTasks') totalTasks: number,
    @Body('completedTasks') completedTasks: number,
    @Body('pendingTasks') pendingTasks: number,
  ) {
    return this.notificationService.createTaskCompletionStatsNotification(
      managerId,
      expertId,
      expertName,
      totalTasks,
      completedTasks,
      pendingTasks,
    );
  }

  @Post('date-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create date count notification',
    description: 'Creates a notification about task count within a date range for a user in a project',
  })
  @ApiResponse({ status: 201, description: 'Date count notification created successfully' })
  createDateCountNotification(
    @Body('userId') userId: string,
    @Body('projectId') projectId: string,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
    @Body('totalTasks') totalTasks: number,
    @Body('completedTasks') completedTasks: number,
    @Body('pendingTasks') pendingTasks: number,
  ) {
    return this.notificationService.createDateCountNotification(
      userId,
      projectId,
      startDate,
      endDate,
      totalTasks,
      completedTasks,
      pendingTasks,
    );
  }
}
