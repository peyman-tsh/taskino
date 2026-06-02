import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../notification.schema';

export class CreateNotificationDto {
  @ApiProperty({ example: '60d21b4667590e1234567890', description: 'User ID' })
  @IsString()
  user!: string;

  @ApiProperty({ example: 'Task Assigned', description: 'Notification title' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'You have been assigned a new task', description: 'Notification message' })
  @IsString()
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
  link?: string;
}