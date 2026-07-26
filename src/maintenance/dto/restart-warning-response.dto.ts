import { ApiProperty } from '@nestjs/swagger';

export class RestartWarningResponseDto {
  @ApiProperty({ example: 'maintenance.restart-warning' })
  event: string;

  @ApiProperty({ example: 60 })
  restartInSeconds: number;

  @ApiProperty({ example: 'Application will restart in 60 seconds.' })
  message: string;

  @ApiProperty({ example: '2026-07-26T08:30:00.000Z' })
  sentAt: string;
}
