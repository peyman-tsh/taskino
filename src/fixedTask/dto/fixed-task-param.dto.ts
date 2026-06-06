import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class FixedTaskParamDto {
  @ApiProperty({ description: 'Fixed task template MongoDB ID' })
  @IsMongoId()
  id: string;
}
