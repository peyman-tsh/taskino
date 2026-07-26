import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MaintenanceDeployTokenGuard } from './maintenance-deploy-token.guard';

describe('MaintenanceDeployTokenGuard', () => {
  const createContext = (token?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-maintenance-deploy-token': token },
        }),
      }),
    }) as any;

  it('accepts the configured deployment token', () => {
    const configService = { get: jest.fn().mockReturnValue('deploy-secret') };
    const guard = new MaintenanceDeployTokenGuard(
      configService as unknown as ConfigService,
    );

    expect(guard.canActivate(createContext('deploy-secret'))).toBe(true);
  });

  it('rejects an invalid deployment token', () => {
    const configService = { get: jest.fn().mockReturnValue('deploy-secret') };
    const guard = new MaintenanceDeployTokenGuard(
      configService as unknown as ConfigService,
    );

    expect(() => guard.canActivate(createContext('wrong-secret'))).toThrow(
      UnauthorizedException,
    );
  });
});
