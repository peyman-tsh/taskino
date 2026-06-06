import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateNotificationDto {
  @ApiProperty({ example: true, description: 'Notification read status' })
  @IsBoolean()
  isRead: boolean;
}
