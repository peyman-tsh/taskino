import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Reset token returned after successful code verification',
  })
  @IsString()
  @MinLength(32)
  resetToken: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewPass123',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
