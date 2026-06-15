import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationType } from '../notification.schema';

@Injectable()
export class GeneralNotificationTemplateFactory {
  leaveRequest(userId: string, title: string): CreateNotificationDto {
    return {
      user: userId,
      title: 'Leave Request',
      message: `A new leave request has been submitted: ${title}`,
      type: NotificationType.LEAVE_REQUEST,
    };
  }

  leaveApproved(userId: string, leaveType: string): CreateNotificationDto {
    return {
      user: userId,
      title: 'Leave Approved',
      message: `Your ${leaveType} leave request has been approved`,
      type: NotificationType.LEAVE_APPROVED,
    };
  }

  leaveRejected(
    userId: string,
    leaveType: string,
    reason?: string,
  ): CreateNotificationDto {
    return {
      user: userId,
      title: 'Leave Rejected',
      message: reason
        ? `Your ${leaveType} leave request has been rejected. Reason: ${reason}`
        : `Your ${leaveType} leave request has been rejected`,
      type: NotificationType.LEAVE_REJECTED,
    };
  }

  userRegistrationApproval(
    managerId: string,
    userId: string,
    fullName: string,
  ): CreateNotificationDto {
    return {
      user: managerId,
      title: 'New User Registration',
      message: `${fullName} registered and is waiting for your approval`,
      type: NotificationType.USER_REGISTRATION_APPROVAL,
      link: `/users/${userId}`,
    };
  }

  taskCompletionStats(
    managerId: string,
    expertId: string,
    expertName: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ): CreateNotificationDto {
    return {
      user: managerId,
      title: 'Task Completion Statistics',
      message: `Expert ${expertName}: ${completedTasks}/${totalTasks} tasks completed, ${pendingTasks} pending`,
      type: NotificationType.TASK_COMPLETION_STATS,
      link: `/tasks/stats?managerId=${managerId}&expertId=${expertId}`,
    };
  }

  dateCount(
    userId: string,
    startDate: string,
    endDate: string,
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
  ): CreateNotificationDto {
    return {
      user: userId,
      title: 'Date Count Summary',
      message: `From ${startDate} to ${endDate}: ${completedTasks}/${totalTasks} tasks completed, ${pendingTasks} pending`,
      type: NotificationType.DATE_COUNT,
      link: `/tasks?startDate=${startDate}&endDate=${endDate}`,
    };
  }
}
