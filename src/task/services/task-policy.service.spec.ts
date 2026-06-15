import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { TaskPolicyService } from './task-policy.service';

describe('TaskPolicyService', () => {
  const userService = { findTaskParticipantsByIds: jest.fn() };
  const service = new TaskPolicyService(userService as unknown as UserService);
  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a specialist to create an extra task', async () => {
    userService.findTaskParticipantsByIds.mockResolvedValue([
      { userId, role: UserRole.SPECIALIST },
    ]);

    await expect(service.assertSpecialist(userId)).resolves.toBeUndefined();
  });

  it('rejects a non-specialist creating an extra task', async () => {
    userService.findTaskParticipantsByIds.mockResolvedValue([
      { userId, role: UserRole.SUPERVISOR },
    ]);

    await expect(service.assertSpecialist(userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
