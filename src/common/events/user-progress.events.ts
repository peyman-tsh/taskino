export const UserProgressEvents = {
  REFRESH_REQUESTED: 'user-progress.refresh-requested',
} as const;

export class UserProgressRefreshRequestedEvent {
  constructor(public readonly userIds: string[]) {}
}
