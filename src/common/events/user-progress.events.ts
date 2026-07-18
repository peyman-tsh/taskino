export const UserProgressEvents = {
  REFRESH_REQUESTED: 'user-progress.refresh-requested',
} as const;

export class UserProgressRefreshRequestedEvent {
  constructor(
    public readonly userIds: string[],
    /**
     * Optional day whose progress should be recalculated. The time portion is
     * normalized to the Tehran day boundary by UserProgressService.
     */
    public readonly progressDate?: Date,
  ) {}
}
