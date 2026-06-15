import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';

describe('UserService specialist progress', () => {
  const repository = {
    findSpecialistProgressById: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  const service = new UserService(
    configService as unknown as ConfigService,
    repository as unknown as UserRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns progress for the authenticated specialist', async () => {
    const userId = new Types.ObjectId().toString();
    repository.findSpecialistProgressById.mockResolvedValue({
      userId,
      progressPercentage: 75,
    });

    await expect(service.getSpecialistProgress(userId)).resolves.toEqual({
      userId,
      progressPercentage: 75,
    });
  });

  it('rejects a user that is not a specialist', async () => {
    const userId = new Types.ObjectId().toString();
    repository.findSpecialistProgressById.mockResolvedValue(null);

    await expect(service.getSpecialistProgress(userId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
