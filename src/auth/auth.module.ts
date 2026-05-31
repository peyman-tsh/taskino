import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('app.jwtSecret') || 'your-super-secret-jwt-key',
        signOptions: {
          expiresIn: configService.get<string>('app.jwtExpiresIn') || '15m',
        } as JwtModuleOptions['signOptions'],
      }),
      inject: [ConfigService],
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,JwtStrategy  ],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}