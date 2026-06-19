import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';
import { EmailService } from '../../email/services/email.service';
import { UserService } from '../../user/services/user.service';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';

export interface VerifyPasswordResetCodeResponse {
  resetToken: string;
  changePasswordEndpoint: string;
}

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
      message: 'If the account exists, a verification code has been sent',
    };

    if (!user?.email) return response;

    const verificationCode = this.generateVerificationCode();
    await this.repository.replaceUserCode(
      user._id,
      this.hashVerificationCode(user._id.toString(), verificationCode),
      this.createExpirationDate(),
    );
    await this.emailService.sendPasswordResetCode(
      user.email,
      user.firstName,
      verificationCode,
    );

    return response;
  }

  async verifyCode(
    mobile: string,
    code: string,
  ): Promise<VerifyPasswordResetCodeResponse> {
    const user = await this.userService.findOptionalByMobile(mobile);
    if (!user) {
      throw new BadRequestException(
        'Verification code is invalid or expired',
      );
    }

    const now = new Date();
    const resetToken = randomBytes(32).toString('hex');
    const verifiedCode = await this.repository.verifyCode(
      user._id,
      this.hashVerificationCode(user._id.toString(), code),
      this.hashToken(resetToken),
      this.createExpirationDate(),
      now,
    );

    if (!verifiedCode) {
      await this.repository.recordFailedAttempt(user._id, now);
      throw new BadRequestException(
        'Verification code is invalid or expired',
      );
    }

    return {
      resetToken,
      changePasswordEndpoint: '/api/auth/password/change',
    };
  }

  async changePassword(
    resetToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const verifiedToken = await this.repository.consumeVerifiedToken(
      this.hashToken(resetToken),
      new Date(),
    );
    if (!verifiedToken) {
      throw new BadRequestException(
        'Password reset session is invalid or expired',
      );
    }

    const saltRounds =
      this.configService.get<number>('app.bcryptSaltRounds') ?? 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await this.userService.updatePasswordHash(
      verifiedToken.userId.toString(),
      passwordHash,
    );

    return { message: 'Password changed successfully' };
  }

  resetPassword(
    resetToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    return this.changePassword(resetToken, newPassword);
  }

  private generateVerificationCode(): string {
    return randomInt(100_000, 1_000_000).toString();
  }

  private createExpirationDate(): Date {
    const expirationMinutes =
      this.configService.get<number>('mail.resetTokenExpiresMinutes') ?? 15;
    return new Date(Date.now() + expirationMinutes * 60_000);
  }

  private hashVerificationCode(userId: string, code: string): string {
    return this.hashToken(`${userId}:${code}`);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
