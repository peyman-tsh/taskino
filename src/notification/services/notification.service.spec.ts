import { FixedTaskNotificationCommandService } from './fixed-task-notification-command.service';
import { GeneralNotificationCommandService } from './general-notification-command.service';
import { NotificationManagementService } from './notification-management.service';
import { NotificationService } from './notification.service';
import { NotificationWriteService } from './notification-write.service';
import { TaskNotificationCommandService } from './task-notification-command.service';

describe('NotificationService', () => {
  const writer = { create: jest.fn(), createBulk: jest.fn() };
  const management = {
    findOneUnread: jest.fn(),
    updateMyReadStatus: jest.fn(),
    markAllMineAsRead: jest.fn(),
    deleteMine: jest.fn(),
    deleteMyReadNotifications: jest.fn(),
  };
  const taskCommands = {
    createAssigned: jest.fn(),
    createCompleted: jest.fn(),
    updateStatus: jest.fn(),
  };
  const fixedTaskCommands = {
    createAssigned: jest.fn(),
    createCompleted: jest.fn(),
  };
  const generalCommands = {
    createLeaveRequest: jest.fn(),
    createLeaveApproved: jest.fn(),
    createLeaveRejected: jest.fn(),
    createUserRegistrationApproval: jest.fn(),
    createTaskCompletionStats: jest.fn(),
    createDateCount: jest.fn(),
  };
  const service = new NotificationService(
    writer as unknown as NotificationWriteService,
    management as unknown as NotificationManagementService,
    taskCommands as unknown as TaskNotificationCommandService,
    fixedTaskCommands as unknown as FixedTaskNotificationCommandService,
    generalCommands as unknown as GeneralNotificationCommandService,
  );

  it('delegates notification operations to focused services', () => {
    service.createTaskAssignedNotification('user-id', 'task-id', 'Task');
    service.updateTaskNotificationsStatus('task-id', 'Task', 'done');
    service.createFixedTaskCompletedNotification('user-id', 'fixed-id', 'Fixed');
    service.markAllMineAsRead('user-id');

    expect(taskCommands.createAssigned).toHaveBeenCalled();
    expect(taskCommands.updateStatus).toHaveBeenCalled();
    expect(fixedTaskCommands.createCompleted).toHaveBeenCalled();
    expect(management.markAllMineAsRead).toHaveBeenCalled();
  });
});
