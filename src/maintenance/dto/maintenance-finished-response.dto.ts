import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceFinishedResponseDto {
  @ApiProperty({ example: 'maintenance.finished' })
  event: string;

  @ApiProperty({ example: 'Application restart completed.' })
  message: string;

  @ApiProperty({ example: '2026-07-26T08:31:00.000Z' })
  sentAt: string;
}
