import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetProjectActivationDto {
  @ApiProperty({
    description: 'Whether the project should be active',
    example: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}
