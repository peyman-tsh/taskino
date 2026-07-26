import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export const MAINTENANCE_RESTART_WARNING_EVENT = 'maintenance.restart-warning';
export const MAINTENANCE_FINISHED_EVENT = 'maintenance.finished';

export interface MaintenanceRestartWarning {
  event: typeof MAINTENANCE_RESTART_WARNING_EVENT;
  restartInSeconds: number;
  message: string;
  sentAt: string;
}

export interface MaintenanceFinishedNotification {
  event: typeof MAINTENANCE_FINISHED_EVENT;
  message: string;
  sentAt: string;
}

@WebSocketGateway({
  namespace: '/maintenance',
  cors: { origin: true, credentials: true },
})
export class MaintenanceGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server: Server;
  private activeRestartWarning: MaintenanceRestartWarning | null = null;

  handleConnection(client: Socket): void {
    if (this.activeRestartWarning) {
      client.emit(
        MAINTENANCE_RESTART_WARNING_EVENT,
        this.activeRestartWarning,
      );
      return;
    }

    client.emit(
      MAINTENANCE_FINISHED_EVENT,
      this.createMaintenanceFinishedNotification(),
    );
  }

  broadcastRestartWarning(
    restartInSeconds: number,
  ): MaintenanceRestartWarning {
    const warning: MaintenanceRestartWarning = {
      event: MAINTENANCE_RESTART_WARNING_EVENT,
      restartInSeconds,
      message: `Application will restart in ${restartInSeconds} seconds.`,
      sentAt: new Date().toISOString(),
    };

    this.activeRestartWarning = warning;
    this.server.emit(MAINTENANCE_RESTART_WARNING_EVENT, warning);
    return warning;
  }

  broadcastMaintenanceFinished(): MaintenanceFinishedNotification {
    this.activeRestartWarning = null;
    const notification = this.createMaintenanceFinishedNotification();

    this.server.emit(MAINTENANCE_FINISHED_EVENT, notification);
    return notification;
  }

  private createMaintenanceFinishedNotification(): MaintenanceFinishedNotification {
    return {
      event: MAINTENANCE_FINISHED_EVENT,
      message: 'Application restart completed.',
      sentAt: new Date().toISOString(),
    };
  }
}
