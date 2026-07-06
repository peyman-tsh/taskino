import {
  IsEnum,
  IsDateString,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  NotificationEntityType,
  NotificationType,
} from '../notification.schema';

export class QueryNotificationDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Filter by notification type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ example: false, description: 'Filter by read status' })
  @IsOptional()
  @IsIn(['true', 'false'])
  isRead?: 'true' | 'false';

  @ApiPropertyOptional({ description: 'Search in title or message' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: NotificationEntityType,
    description: 'Filter by related entity type',
  })
  @IsOptional()
  @IsEnum(NotificationEntityType)
  entityType?: NotificationEntityType;

  @ApiPropertyOptional({
    description: 'Filter by related entity ID',
  })
  @IsOptional()
  @IsMongoId()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Return notifications created at or after this date',
    example: '2026-07-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Return notifications created at or before this date',
    example: '2026-07-06T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
