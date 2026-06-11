import { Types } from 'mongoose';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskRecurrence, TaskStatus } from '../../task/task.schema';
import {
  UserPerformanceStatus,
  UserRole,
} from '../../user/schemas/user.schema';

export interface PeriodPerformanceUser {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles: UserRole;
}

export interface PeriodPerformanceTask {
  status: TaskStatus;
  dueDate?: Date;
  doneTime?: Date;
}

export interface PeriodPerformanceFixedTask {
  status: FixedTaskStatus;
  doneTime?: Date;
}

export interface PeriodPerformanceMetrics {
  recurrence: TaskRecurrence;
  periodStart: Date;
  periodEnd: Date;
  totalTasks: number;
  completedTasksInPeriod: number;
  onTimeTasks: number;
  totalFixedTasks: number;
  completedFixedTasksInPeriod: number;
  progressPercentage: number;
  performanceStatus: UserPerformanceStatus;
}
