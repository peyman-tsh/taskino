import { MaintenanceGateway } from './maintenance.gateway';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  it('broadcasts a restart warning with a 60-second countdown', () => {
    const gateway = {
      broadcastRestartWarning: jest.fn().mockReturnValue({
        event: 'maintenance.restart-warning',
        restartInSeconds: 60,
      }),
    };
    const service = new MaintenanceService(
      gateway as unknown as MaintenanceGateway,
    );

    expect(service.notifyRestartInSixtySeconds()).toEqual({
      event: 'maintenance.restart-warning',
      restartInSeconds: 60,
    });
    expect(gateway.broadcastRestartWarning).toHaveBeenCalledWith(60);
  });
});
