import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InternalEventBus } from '../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../common/events/user-progress.events';
import { UserProgressService } from './services/user-progress.service';

@Injectable()
export class UserProgressEventListener implements OnModuleInit, OnModuleDestroy {
  private unsubscribe?: () => void;

  constructor(
    private readonly eventBus: InternalEventBus,
    private readonly progressService: UserProgressService,
  ) {}

  onModuleInit(): void {
    this.unsubscribe =
      this.eventBus.subscribe<UserProgressRefreshRequestedEvent>(
        UserProgressEvents.REFRESH_REQUESTED,
        (event) => this.progressService.refreshUsers(event.userIds),
      );
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }
}
