import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../task.schema';

export class TaskCompletionStatsDto {
  @ApiProperty({
    description: 'ID of the manager (who created the tasks)',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
  })
  @IsString()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({
    description: 'ID of the expert/specialist (to whom tasks are assigned)',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsString()
  @IsNotEmpty()
  expertId: string;
}
