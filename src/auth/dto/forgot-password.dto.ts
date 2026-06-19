import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: '09223689925' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, {
    message: 'شماره موبایل معتبر نیست',
  })
  mobile: string;
}