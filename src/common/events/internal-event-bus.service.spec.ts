import { InternalEventBus } from './internal-event-bus.service';

describe('InternalEventBus', () => {
  it('waits for async event handlers', async () => {
    const eventBus = new InternalEventBus();
    let completed = false;
    eventBus.subscribe('test-event', async () => {
      await Promise.resolve();
      completed = true;
    });

    await eventBus.publishAndWait('test-event', {});

    expect(completed).toBe(true);
  });
});
