import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { TaskRepository } from '../repositories/task.repository';
import { SpecialistTaskQueryService } from './specialist-task-query.service';

describe('SpecialistTaskQueryService', () => {
  const repository = { findPaginated: jest.fn() };
  const userService = { findById: jest.fn() };
  const service = new SpecialistTaskQueryService(
    repository as unknown as TaskRepository,
    userService as unknown as UserService,
  );
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns tasks assigned to a specialist', async () => {
    userService.findById.mockResolvedValue({ roles: UserRole.SPECIALIST });
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    const result = await service.findBySpecialist(userId, 1, 10);

    expect(repository.findPaginated).toHaveBeenCalledWith(
      { assignedTo: new Types.ObjectId(userId) },
      1,
      10,
    );
    expect(result.total).toBe(0);
  });

  it('rejects a user without specialist role', async () => {
    userService.findById.mockResolvedValue({ roles: UserRole.SUPERVISOR });

    await expect(service.findBySpecialist(userId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
