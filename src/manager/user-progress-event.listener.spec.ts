import { InternalEventBus } from '../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../common/events/user-progress.events';
import { UserProgressService } from './services/user-progress.service';
import { UserProgressEventListener } from './user-progress-event.listener';

describe('UserProgressEventListener', () => {
  it('subscribes progress refresh events to the progress service', async () => {
    let handler:
      | ((event: UserProgressRefreshRequestedEvent) => Promise<void>)
      | undefined;
    const eventBus = {
      subscribe: jest.fn(
        (
          eventName: string,
          subscribedHandler: (
            event: UserProgressRefreshRequestedEvent,
          ) => Promise<void>,
        ) => {
          expect(eventName).toBe(UserProgressEvents.REFRESH_REQUESTED);
          handler = subscribedHandler;
          return jest.fn();
        },
      ),
    };
    const progressService = { refreshUsers: jest.fn() };
    const listener = new UserProgressEventListener(
      eventBus as unknown as InternalEventBus,
      progressService as unknown as UserProgressService,
    );

    listener.onModuleInit();
    await handler?.(new UserProgressRefreshRequestedEvent(['user-id']));

    expect(progressService.refreshUsers).toHaveBeenCalledWith(['user-id']);
  });
});
