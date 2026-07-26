import {
  MAINTENANCE_FINISHED_EVENT,
  MAINTENANCE_RESTART_WARNING_EVENT,
  MaintenanceGateway,
} from './maintenance.gateway';

describe('MaintenanceGateway', () => {
  it('emits the restart warning to every connected maintenance client', () => {
    const gateway = new MaintenanceGateway();
    const server = { emit: jest.fn() };
    Object.assign(gateway, { server });

    const warning = gateway.broadcastRestartWarning(60);

    expect(server.emit).toHaveBeenCalledWith(
      MAINTENANCE_RESTART_WARNING_EVENT,
      warning,
    );
    expect(warning).toMatchObject({
      event: MAINTENANCE_RESTART_WARNING_EVENT,
      restartInSeconds: 60,
      message: 'Application will restart in 60 seconds.',
    });
    expect(warning.sentAt).toEqual(expect.any(String));
  });

  it('emits a completion event to every connected maintenance client', () => {
    const gateway = new MaintenanceGateway();
    const server = { emit: jest.fn() };
    Object.assign(gateway, { server });

    const notification = gateway.broadcastMaintenanceFinished();

    expect(server.emit).toHaveBeenCalledWith(
      MAINTENANCE_FINISHED_EVENT,
      notification,
    );
    expect(notification).toMatchObject({
      event: MAINTENANCE_FINISHED_EVENT,
      message: 'Application restart completed.',
    });
  });

  it('sends the current maintenance state when a client connects', () => {
    const gateway = new MaintenanceGateway();
    const server = { emit: jest.fn() };
    const client = { emit: jest.fn() };
    Object.assign(gateway, { server });

    gateway.handleConnection(client as any);

    expect(client.emit).toHaveBeenCalledWith(
      MAINTENANCE_FINISHED_EVENT,
      expect.objectContaining({ event: MAINTENANCE_FINISHED_EVENT }),
    );

    const warning = gateway.broadcastRestartWarning(60);
    client.emit.mockClear();
    gateway.handleConnection(client as any);

    expect(client.emit).toHaveBeenCalledWith(
      MAINTENANCE_RESTART_WARNING_EVENT,
      warning,
    );
  });
});
