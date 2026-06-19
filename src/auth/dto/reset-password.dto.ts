import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'One-time reset token received by email' })
  @IsString()
  @MinLength(32)
  token: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewPass123',
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
