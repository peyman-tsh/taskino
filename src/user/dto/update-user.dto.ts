import { IsString, IsEmail, IsOptional, Matches, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name of the user', example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name of the user', example: 'Smith' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email address of the user', example: 'jane.smith@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Mobile number of the user', example: '+989123456789' })
  @IsOptional()
  @Matches(/^[0-9+*-]+$/, {
    message: 'Mobile number must contain only digits and + sign',
  })
  mobile?: string;

  @ApiPropertyOptional({ description: 'Password (min 6 characters)', example: 'NewPass1234' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

}