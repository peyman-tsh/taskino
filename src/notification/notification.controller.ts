import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { NotificationParamDto } from './dto/notification-param.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationQueryService } from './services/notification-query.service';
import { NotificationService } from './services/notification.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Valid JWT token is required' })
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationQueryService: NotificationQueryService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiOkResponse({ description: 'Notifications retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findMine(
    @CurrentUserId() userId: string,
    @Query() queryDto: QueryNotificationDto,
  ) {
    return this.notificationQueryService.findMine(userId, queryDto);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get current user unread notification count' })
  @ApiOkResponse({ description: 'Unread count retrieved successfully' })
  getMyUnreadCount(@CurrentUserId() userId: string) {
    return this.notificationQueryService.getMyUnreadCount(userId);
  }

  @Get('me/unread')
  @ApiOperation({ summary: 'Get one unread notification of current user' })
  @ApiOkResponse({ description: 'Unread notification retrieved successfully' })
  findOneUnread(@CurrentUserId() userId: string) {
    return this.notificationService.findOneUnread(userId);
  }

  @Patch('me/read-all')
  @ApiOperation({ summary: 'Mark all current user notifications as read' })
  @ApiOkResponse({ description: 'Notifications marked as read successfully' })
  markAllMineAsRead(@CurrentUserId() userId: string) {
    return this.notificationService.markAllMineAsRead(userId);
  }

  @Delete('me/read')
  @ApiOperation({ summary: 'Delete all read notifications of current user' })
  @ApiOkResponse({ description: 'Read notifications deleted successfully' })
  deleteMyReadNotifications(@CurrentUserId() userId: string) {
    return this.notificationService.deleteMyReadNotifications(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one current user notification' })
  @ApiParam({ name: 'id', description: 'Notification MongoDB object ID' })
  @ApiOkResponse({ description: 'Notification retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  findMineById(
    @CurrentUserId() userId: string,
    @Param() params: NotificationParamDto,
  ) {
    return this.notificationQueryService.findMineById(userId, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update current user notification read status' })
  @ApiParam({ name: 'id', description: 'Notification MongoDB object ID' })
  @ApiOkResponse({ description: 'Notification read status updated successfully' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  updateMyReadStatus(
    @CurrentUserId() userId: string,
    @Param() params: NotificationParamDto,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    dto: UpdateNotificationDto,
  ) {
    return this.notificationService.updateMyReadStatus(userId, params.id, dto.isRead);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one current user notification' })
  @ApiParam({ name: 'id', description: 'Notification MongoDB object ID' })
  @ApiNoContentResponse({ description: 'Notification deleted successfully' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  deleteMine(
    @CurrentUserId() userId: string,
    @Param() params: NotificationParamDto,
  ) {
    return this.notificationService.deleteMine(userId, params.id);
  }
}
