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
    replaceUserCode: jest.fn(),
    verifyCode: jest.fn(),
    recordFailedAttempt: jest.fn(),
    consumeVerifiedToken: jest.fn(),
  };
  const userService = {
    findOptionalByMobile: jest.fn(),
    updatePasswordHash: jest.fn(),
  };
  const emailService = {
    sendPasswordResetCode: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'mail.resetTokenExpiresMinutes': 15,
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
  const user = {
    _id: new Types.ObjectId(),
    firstName: 'Ali',
    email: 'ali@example.com',
  } as UserDocument;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a six-digit code and sends it by email', async () => {
    userService.findOptionalByMobile.mockResolvedValue(user);

    await service.requestReset('09120000000');

    expect(repository.replaceUserCode).toHaveBeenCalledWith(
      user._id,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(emailService.sendPasswordResetCode).toHaveBeenCalledWith(
      user.email,
      user.firstName,
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('does not reveal when the mobile does not exist', async () => {
    userService.findOptionalByMobile.mockResolvedValue(null);

    await expect(service.requestReset('09120000000')).resolves.toEqual({
      message: 'If the account exists, a verification code has been sent',
    });
    expect(repository.replaceUserCode).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('returns a reset token after code verification', async () => {
    userService.findOptionalByMobile.mockResolvedValue(user);
    repository.verifyCode.mockResolvedValue({ userId: user._id });

    const result = await service.verifyCode('09120000000', '123456');

    expect(repository.verifyCode).toHaveBeenCalledWith(
      user._id,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
      expect.any(Date),
    );
    expect(result).toEqual({
      resetToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      changePasswordEndpoint: '/api/auth/password/change',
    });
  });

  it('records a failed verification attempt', async () => {
    userService.findOptionalByMobile.mockResolvedValue(user);
    repository.verifyCode.mockResolvedValue(null);

    await expect(
      service.verifyCode('09120000000', '000000'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.recordFailedAttempt).toHaveBeenCalledWith(
      user._id,
      expect.any(Date),
    );
  });

  it('changes the password with a verified reset token', async () => {
    repository.consumeVerifiedToken.mockResolvedValue({ userId: user._id });

    await service.changePassword('a'.repeat(64), 'new-password');

    expect(repository.consumeVerifiedToken).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(userService.updatePasswordHash).toHaveBeenCalledWith(
      user._id.toString(),
      expect.not.stringMatching(/^new-password$/),
    );
  });

  it('rejects an invalid password reset session', async () => {
    repository.consumeVerifiedToken.mockResolvedValue(null);

    await expect(
      service.changePassword('a'.repeat(64), 'new-password'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userService.updatePasswordHash).not.toHaveBeenCalled();
  });
});
