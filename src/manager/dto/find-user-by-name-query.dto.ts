import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class FindUserByNameQueryDto {
  @ApiProperty({ description: 'User first name', example: 'سینا' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'اعلایی' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;
}
