import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AssignProjectSpecialistDto {
  @ApiProperty({
    description: 'ID of the specialist who becomes responsible for the entire project',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsMongoId()
  assigneeId: string;
}
