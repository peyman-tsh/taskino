import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './schemas/password-reset-token.schema';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';
import { PasswordResetService } from './services/password-reset.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    EmailModule,
    MongooseModule.forFeature([
      {
        name: PasswordResetToken.name,
        schema: PasswordResetTokenSchema,
      },
    ]),
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
    AuthService,
    JwtStrategy,
    PasswordResetTokenRepository,
    PasswordResetService,
  ],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
