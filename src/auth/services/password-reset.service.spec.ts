import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { EmailService } from '../../email/services/email.service';
import { UserDocument } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  const repository = {
    replaceUserToken: jest.fn(),
    consumeValidToken: jest.fn(),
  };
  const userService = {
    findOptionalByMobile: jest.fn(),
    updatePasswordHash: jest.fn(),
  };
  const emailService = {
    sendPasswordReset: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'mail.resetTokenExpiresMinutes': 15,
        'mail.resetUrl': 'http://localhost:3001/reset-password',
        'app.bcryptSaltRounds': 4,
      };
      return values[key];
    }),
  };
  const service = new PasswordResetService(
    repository as unknown as PasswordResetTokenRepository,
    userService as unknown as UserService,
    emailService as unknown as EmailService,
    configService as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a hashed token and sends the raw token by email', async () => {
    const user = {
      _id: new Types.ObjectId(),
      firstName: 'Ali',
      email: 'ali@example.com',
    } as UserDocument;
    userService.findOptionalByMobile.mockResolvedValue(user);

    await service.requestReset('09120000000');

    expect(repository.replaceUserToken).toHaveBeenCalledWith(
      user._id,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      user.email,
      user.firstName,
      expect.stringContaining('/reset-password?token='),
    );
  });

  it('does not reveal when the mobile does not exist', async () => {
    userService.findOptionalByMobile.mockResolvedValue(null);

    await expect(service.requestReset('09120000000')).resolves.toEqual({
      message: 'If the account exists, a password reset email has been sent',
    });
    expect(repository.replaceUserToken).not.toHaveBeenCalled();
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('updates the password when the token is valid', async () => {
    const userId = new Types.ObjectId();
    repository.consumeValidToken.mockResolvedValue({ userId });

    await service.resetPassword('a'.repeat(64), 'new-password');

    expect(repository.consumeValidToken).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(userService.updatePasswordHash).toHaveBeenCalledWith(
      userId.toString(),
      expect.not.stringMatching(/^new-password$/),
    );
  });

  it('rejects an invalid or expired token', async () => {
    repository.consumeValidToken.mockResolvedValue(null);

    await expect(
      service.resetPassword('a'.repeat(64), 'new-password'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userService.updatePasswordHash).not.toHaveBeenCalled();
  });
});
