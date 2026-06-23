import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';

export interface WorkStatusItem {
  status: TaskStatus | FixedTaskStatus;
  dueDate?: Date;
  endDate?: Date;
  endTime?: string;
  isActive?: boolean;
}

export interface WorkStatusUser {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface WorkStatusUserItem extends WorkStatusItem {
  user?: WorkStatusUser;
}

export interface WorkStatusCounts {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  overdueUnfinished: number;
}

export interface UserWorkStatusCounts {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  tasks: WorkStatusCounts;
  fixedTasks: WorkStatusCounts;
}
