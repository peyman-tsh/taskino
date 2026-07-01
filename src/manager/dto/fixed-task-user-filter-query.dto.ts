import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';

export class FixedTaskUserFilterQueryDto {
  @ApiProperty({
    description: 'Optional user ID to return fixed tasks for one assigned user',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;
}
