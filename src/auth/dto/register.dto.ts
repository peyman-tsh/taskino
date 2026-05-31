import { IsString, IsEmail, MinLength, Matches, IsOptional, IsEnum, ArrayNotEmpty, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/user/schemas/user.schema';

export class RegisterDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email address of the user', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Mobile number of the user', example: '+989123456789' })
  @IsOptional()
  @Matches(/^[0-9+*-]+$/, {
    message: 'Mobile number must contain only digits and + sign',
  })
  mobile?: string;

  @ApiProperty({ description: 'Password (min 6 characters)', example: 'Pass1234' })
  @IsString()
  @MinLength(6)
  password: string;

 @ApiProperty({ description: 'Role of the user', example: 'Specialist' })
 @IsOptional()
 @IsString()
 roles?:string;
}