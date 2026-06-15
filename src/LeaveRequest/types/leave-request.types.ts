import { LeaveRecurrence, LeaveStatus } from '../LeaveRequest.schema';

export interface LeaveRequestFilters {
  user?: string;
  status?: LeaveStatus;
  approvedBy?: string;
  recurrence?: LeaveRecurrence;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}
