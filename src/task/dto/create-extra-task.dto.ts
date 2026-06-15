import { OmitType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

export class CreateExtraTaskDto extends OmitType(CreateTaskDto, [
  'createdBy',
  'assignedTo',
  'status',
] as const) {}
