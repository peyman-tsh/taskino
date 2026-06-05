import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId } from 'class-validator';
import { TaskStatus } from '../../task/task.schema';

export class UpdateSupervisedTaskStatusDto {
  @ApiProperty({
    description: 'New task status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}

export class SupervisorTaskParamDto {
  @ApiProperty({
    description: 'Supervised project MongoDB object ID',
    example: '64a7b1c2d3e4f5a6b7c8d9e1',
  })
  @IsMongoId()
  projectId: string;

  @ApiProperty({
    description: 'Task MongoDB object ID',
    example: '64a7b1c2d3e4f5a6b7c8d9e2',
  })
  @IsMongoId()
  taskId: string;
}
