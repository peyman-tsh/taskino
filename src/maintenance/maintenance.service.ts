import { Injectable } from '@nestjs/common';
import {
  MaintenanceGateway,
  MaintenanceRestartWarning,
} from './maintenance.gateway';

@Injectable()
export class MaintenanceService {
  private static readonly RESTART_WARNING_SECONDS = 60;

  constructor(private readonly gateway: MaintenanceGateway) {}

  notifyRestartInSixtySeconds(): MaintenanceRestartWarning {
    return this.gateway.broadcastRestartWarning(
      MaintenanceService.RESTART_WARNING_SECONDS,
    );
  }
}
