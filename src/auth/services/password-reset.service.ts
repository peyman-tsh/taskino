import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { EmailService } from '../../email/services/email.service';
import { UserService } from '../../user/services/user.service';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly repository: PasswordResetTokenRepository,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async requestReset(mobile: string): Promise<{ message: string }> {
    const user = await this.userService.findOptionalByMobile(mobile);
    const response = {
      message: 'If the account exists, a password reset email has been sent',
    };

    if (!user?.email) return response;

    const token = randomBytes(32).toString('hex');
    const expiresAt = this.createExpirationDate();
    await this.repository.replaceUserToken(
      user._id,
      this.hashToken(token),
      expiresAt,
    );

    await this.emailService.sendPasswordReset(
      user.email,
      user.firstName,
    );
    return response;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const resetToken = await this.repository.consumeValidToken(
      this.hashToken(token),
      new Date(),
    );
    if (!resetToken) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const saltRounds =
      this.configService.get<number>('app.bcryptSaltRounds') ?? 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await this.userService.updatePasswordHash(
      resetToken.userId.toString(),
      passwordHash,
    );

    return { message: 'Password changed successfully' };
  }

  private createExpirationDate(): Date {
    const expirationMinutes =
      this.configService.get<number>('mail.resetTokenExpiresMinutes') ?? 15;
    return new Date(Date.now() + expirationMinutes * 60_000);
  }

  private createResetUrl(token: string): string {
    const baseUrl =
      this.configService.get<string>('mail.resetUrl') ??
      'http://localhost:3001/reset-password';
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
