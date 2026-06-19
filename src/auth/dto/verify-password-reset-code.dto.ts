import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class VerifyPasswordResetCodeDto {
  @ApiProperty({ example: '09223689925' })
  @Matches(/^09\d{9}$/, {
    message: 'Mobile number is invalid',
  })
  mobile: string;

  @ApiProperty({
    description: 'Six-digit code received by email',
    example: '483921',
  })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Verification code must contain exactly 6 digits',
  })
  code: string;
}
