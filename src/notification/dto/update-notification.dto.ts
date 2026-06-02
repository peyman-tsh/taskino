import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../notification.schema';
import { CreateNotificationDto } from './create-notification.dto';

export class UpdateNotificationDto {
  @ApiPropertyOptional({ example: '60d21b4667590e1234567890', description: 'User ID' })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ example: 'Task Updated', description: 'Notification title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'The task has been updated', description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Notification type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ example: true, description: 'Read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ example: '/tasks/123', description: 'Link to related resource' })
  @IsOptional()
  @IsString()
  link?: string;
}