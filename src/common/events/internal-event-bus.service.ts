import { Injectable, Logger } from '@nestjs/common';

type EventHandler<T> = (event: T) => Promise<void> | void;

@Injectable()
export class InternalEventBus {
  private readonly logger = new Logger(InternalEventBus.name);
  private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();

  subscribe<T>(eventName: string, handler: EventHandler<T>): () => void {
    const eventHandlers = this.handlers.get(eventName) ?? new Set<EventHandler<unknown>>();
    eventHandlers.add(handler as EventHandler<unknown>);
    this.handlers.set(eventName, eventHandlers);

    return () => eventHandlers.delete(handler as EventHandler<unknown>);
  }

  publish<T>(eventName: string, event: T): void {
    const eventHandlers = [...(this.handlers.get(eventName) ?? [])];

    eventHandlers.forEach((handler) => {
      queueMicrotask(() => {
        Promise.resolve(handler(event)).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Event handler failed for "${eventName}": ${message}`);
        });
      });
    });
  }

  async publishAndWait<T>(eventName: string, event: T): Promise<void> {
    const eventHandlers = [...(this.handlers.get(eventName) ?? [])];
    await Promise.all(
      eventHandlers.map((handler) =>
        Promise.resolve(handler(event)).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Event handler failed for "${eventName}": ${message}`);
          throw error;
        }),
      ),
    );
  }
}
