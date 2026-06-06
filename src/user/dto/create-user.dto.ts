import { IsString, IsEmail, IsOptional, MinLength, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkField } from '../../common/enums/work-field.enum';

export class CreateUserDto {
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

  @ApiProperty({ description: 'User work field', enum: WorkField, example: WorkField.IT })
  @IsEnum(WorkField)
  workField: WorkField;
}
