import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class MaintenanceDeployTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.configService.get<string>(
      'MAINTENANCE_DEPLOY_TOKEN',
    );
    const suppliedToken = context
      .switchToHttp()
      .getRequest()
      .headers['x-maintenance-deploy-token'];

    if (
      !expectedToken ||
      typeof suppliedToken !== 'string' ||
      Buffer.byteLength(suppliedToken) !== Buffer.byteLength(expectedToken) ||
      !timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(expectedToken))
    ) {
      throw new UnauthorizedException('Invalid maintenance deployment token');
    }

    return true;
  }
}
