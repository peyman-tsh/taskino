import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class SupervisorProjectParamDto {
  @ApiProperty({
    description: 'Project MongoDB object ID',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsMongoId()
  projectId: string;
}
