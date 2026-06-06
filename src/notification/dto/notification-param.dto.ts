import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class NotificationParamDto {
  @ApiProperty({
    description: 'Notification MongoDB object ID',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsMongoId()
  id: string;
}
