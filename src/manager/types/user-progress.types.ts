import { Types } from 'mongoose';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import {
  UserPerformanceStatus,
  UserRole,
} from '../../user/schemas/user.schema';

export interface ProgressUser {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles: UserRole;
}

export interface ProgressTask {
  status: TaskStatus;
  dueDate?: Date;
  doneTime?: Date;
}

export interface ProgressFixedTask {
  status: FixedTaskStatus;
  doneTime?: Date;
}

export interface ProgressMetrics {
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;
  inProgressTasks: number;
  totalFixedTasks: number;
  completedFixedTasks: number;
  inProgressFixedTasks: number;
  progressPercentage: number;
  performanceStatus: UserPerformanceStatus;
}
