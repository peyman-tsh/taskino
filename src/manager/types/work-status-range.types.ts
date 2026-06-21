import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';

export interface WorkStatusItem {
  status: TaskStatus | FixedTaskStatus;
  dueDate?: Date;
  endDate?: Date;
  endTime?: string;
}

export interface WorkStatusCounts {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  overdueUnfinished: number;
}
