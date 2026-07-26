import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { Roles } from '../user/roles.decorator';
import { RolesGuard } from '../user/roles.guard';
import { UserRole } from '../user/schemas/user.schema';
import { RestartWarningResponseDto } from './dto/restart-warning-response.dto';
import { MaintenanceDeployTokenGuard } from './guards/maintenance-deploy-token.guard';
import { MaintenanceService } from './maintenance.service';

@ApiTags('Maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post('restart-warning')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER)
  @ApiOperation({
    summary: 'Warn connected clients about an upcoming application restart',
    description:
      'Immediately broadcasts a Socket.IO maintenance.restart-warning event stating that the application will restart in 60 seconds.',
  })
  @ApiOkResponse({ type: RestartWarningResponseDto })
  sendRestartWarning() {
    return this.maintenanceService.notifyRestartInSixtySeconds();
  }

  @Post('restart-warning/deploy')
  @HttpCode(HttpStatus.OK)
  @UseGuards(MaintenanceDeployTokenGuard)
  @ApiHeader({
    name: 'x-maintenance-deploy-token',
    required: true,
    description: 'Deployment secret configured as MAINTENANCE_DEPLOY_TOKEN.',
  })
  @ApiOperation({
    summary: 'Send the deployment restart warning',
    description:
      'For the VPS deployment script. Broadcasts the 60-second restart warning using the maintenance deployment secret.',
  })
  @ApiOkResponse({ type: RestartWarningResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid maintenance deployment token' })
  sendDeploymentRestartWarning() {
    return this.maintenanceService.notifyRestartInSixtySeconds();
  }
}
