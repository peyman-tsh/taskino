import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ExtraTaskApprovalStatus } from '../../task/task.schema';

export class ExtraTaskApprovalDto {
  @ApiProperty({
    enum: [ExtraTaskApprovalStatus.APPROVED, ExtraTaskApprovalStatus.REJECTED],
    example: ExtraTaskApprovalStatus.APPROVED,
  })
  @IsEnum([ExtraTaskApprovalStatus.APPROVED, ExtraTaskApprovalStatus.REJECTED])
  status: ExtraTaskApprovalStatus.APPROVED | ExtraTaskApprovalStatus.REJECTED;
}
