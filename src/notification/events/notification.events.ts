export const NotificationEvents = {
  TASK_ASSIGNED: 'notification.task.assigned',
  TASK_COMPLETED: 'notification.task.completed',
  TASK_STATUS_CHANGED: 'notification.task.status-changed',
  FIXED_TASK_ASSIGNED: 'notification.fixed-task.assigned',
  FIXED_TASK_COMPLETED: 'notification.fixed-task.completed',
} as const;

export class TaskAssignedNotificationEvent {
  constructor(
    public readonly userIds: string[],
    public readonly taskId: string,
    public readonly taskTitle: string,
  ) {}
}

export class TaskCompletedNotificationEvent {
  constructor(
    public readonly creatorId: string,
    public readonly taskId: string,
    public readonly taskTitle: string,
    public readonly completedBy: string,
  ) {}
}

export class TaskStatusChangedNotificationEvent {
  constructor(
    public readonly taskId: string,
    public readonly taskTitle: string,
    public readonly status: string,
  ) {}
}

export class FixedTaskAssignedNotificationEvent {
  constructor(
    public readonly userId: string,
    public readonly fixedTaskId: string,
    public readonly fixedTaskTitle: string,
  ) {}
}

export class FixedTaskCompletedNotificationEvent {
  constructor(
    public readonly creatorId: string,
    public readonly fixedTaskId: string,
    public readonly fixedTaskTitle: string,
  ) {}
}
