import { IsOptional, IsString, IsEnum, IsBoolean, IsMongoId, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationEntityType,
  NotificationType,
} from '../notification.schema';

export class CreateNotificationDto {
  @ApiProperty({ example: '60d21b4667590e1234567890', description: 'User ID' })
  @IsMongoId()
  user!: string;

  @ApiProperty({ example: 'Task Assigned', description: 'Notification title' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ example: 'You have been assigned a new task', description: 'Notification message' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiPropertyOptional({ example: false, description: 'Read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ example: '/tasks/123', description: 'Link to related resource' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @ApiPropertyOptional({
    enum: NotificationEntityType,
    description: 'Type of the entity related to this notification',
  })
  @IsOptional()
  @IsEnum(NotificationEntityType)
  entityType?: NotificationEntityType;

  @ApiPropertyOptional({
    example: '60d21b4667590e1234567890',
    description: 'ID of the entity related to this notification',
  })
  @IsOptional()
  @IsMongoId()
  entityId?: string;
}
