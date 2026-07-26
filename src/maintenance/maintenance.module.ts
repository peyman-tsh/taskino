import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceGateway } from './maintenance.gateway';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceDeployTokenGuard } from './guards/maintenance-deploy-token.guard';

@Module({
  controllers: [MaintenanceController],
  providers: [
    MaintenanceGateway,
    MaintenanceService,
    MaintenanceDeployTokenGuard,
  ],
})
export class MaintenanceModule {}
