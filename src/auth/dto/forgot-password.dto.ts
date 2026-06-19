import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Mobile number of the account receiving the reset email',
    example: '09123456789',
  })
  @Matches(/^[0-9+*-]+$/, {
    message: 'Mobile number must contain only digits and + sign',
  })
  mobile: string;
}
