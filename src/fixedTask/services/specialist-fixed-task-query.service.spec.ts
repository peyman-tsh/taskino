import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { SpecialistFixedTaskQueryService } from './specialist-fixed-task-query.service';

describe('SpecialistFixedTaskQueryService', () => {
  const repository = { findPaginated: jest.fn() };
  const userService = { findById: jest.fn() };
  const service = new SpecialistFixedTaskQueryService(
    repository as unknown as FixedTaskRepository,
    userService as unknown as UserService,
  );
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns fixed tasks assigned to a specialist', async () => {
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

  it('returns fixed tasks assigned to a supervisor', async () => {
    userService.findById.mockResolvedValue({ roles: UserRole.SUPERVISOR });
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    const result = await service.findBySpecialist(userId, 1, 10);

    expect(repository.findPaginated).toHaveBeenCalledWith(
      { assignedTo: new Types.ObjectId(userId) },
      1,
      10,
    );
    expect(result.total).toBe(0);
  });

  it('returns only completed fixed tasks assigned to the user', async () => {
    userService.findById.mockResolvedValue({ roles: UserRole.SPECIALIST });
    repository.findPaginated.mockResolvedValue({ data: [], total: 0 });

    const result = await service.findCompletedByUser(userId, 2, 20);

    expect(repository.findPaginated).toHaveBeenCalledWith(
      {
        assignedTo: new Types.ObjectId(userId),
        status: 'done',
        isActive: true,
      },
      2,
      20,
    );
    expect(result).toEqual({ data: [], total: 0, page: 2, limit: 20 });
  });

  it('rejects a user without specialist or supervisor role', async () => {
    userService.findById.mockResolvedValue({ roles: UserRole.MANAGER });

    await expect(service.findBySpecialist(userId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
