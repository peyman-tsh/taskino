import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export const MAINTENANCE_RESTART_WARNING_EVENT = 'maintenance.restart-warning';

export interface MaintenanceRestartWarning {
  event: typeof MAINTENANCE_RESTART_WARNING_EVENT;
  restartInSeconds: number;
  message: string;
  sentAt: string;
}

@WebSocketGateway({
  namespace: '/maintenance',
  cors: { origin: true, credentials: true },
})
export class MaintenanceGateway {
  @WebSocketServer()
  private server: Server;

  broadcastRestartWarning(
    restartInSeconds: number,
  ): MaintenanceRestartWarning {
    const warning: MaintenanceRestartWarning = {
      event: MAINTENANCE_RESTART_WARNING_EVENT,
      restartInSeconds,
      message: `Application will restart in ${restartInSeconds} seconds.`,
      sentAt: new Date().toISOString(),
    };

    this.server.emit(MAINTENANCE_RESTART_WARNING_EVENT, warning);
    return warning;
  }
}
