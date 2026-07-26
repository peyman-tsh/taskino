import {
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
});
