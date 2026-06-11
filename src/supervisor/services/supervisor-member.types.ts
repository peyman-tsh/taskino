import { Types } from 'mongoose';
import { UserPerformanceStatus, UserRole } from '../../user/schemas/user.schema';

export interface SupervisorMemberProfile {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  roles: UserRole;
  isActive: boolean;
  score?: number;
  progressPercentage: number;
  performanceStatus: UserPerformanceStatus;
  performanceEvaluatedAt?: Date;
}

export interface SupervisorMemberWorkCounts {
  userId: Types.ObjectId;
  total: number;
  completed: number;
}
