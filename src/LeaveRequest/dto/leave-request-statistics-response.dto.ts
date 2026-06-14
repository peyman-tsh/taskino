import { ApiProperty } from '@nestjs/swagger';

export class LeaveRequestStatisticsResponseDto {
  @ApiProperty({ example: 20 })
  totalRequests: number;

  @ApiProperty({ example: 8 })
  pendingRequests: number;

  @ApiProperty({ example: 9 })
  approvedRequests: number;

  @ApiProperty({ example: 3 })
  rejectedRequests: number;
}
