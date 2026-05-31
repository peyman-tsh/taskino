import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Mobile number of the user', example: '1234567890' })
  @IsString()
  mobile: string;

  @ApiProperty({ description: 'Password of the user', example: 'Pass1234' })
  @IsString()
  @MinLength(6)
  password: string;
}