export const NotificationEvents = {
  TASK_ASSIGNED: 'notification.task.assigned',
  TASK_COMPLETED: 'notification.task.completed',
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
