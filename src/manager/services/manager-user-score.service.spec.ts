import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UserService } from '../../user/services/user.service';
import { ManagerUserScoreService } from './manager-user-score.service';

describe('ManagerUserScoreService', () => {
  const userService = { adjustSpecialistScoreManually: jest.fn() };
  const service = new ManagerUserScoreService(
    userService as unknown as UserService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a manual score to a specialist', async () => {
    userService.adjustSpecialistScoreManually.mockResolvedValue({ score: 20 });

    await service.adjustSpecialistScore('specialist-id', 20);

    expect(userService.adjustSpecialistScoreManually).toHaveBeenCalledWith(
      'specialist-id',
      20,
    );
  });

  it('subtracts a manual score from a specialist', async () => {
    userService.adjustSpecialistScoreManually.mockResolvedValue({ score: 0 });

    const result = await service.adjustSpecialistScore('specialist-id', -20);

    expect(userService.adjustSpecialistScoreManually).toHaveBeenCalledWith(
      'specialist-id',
      -20,
    );
    expect(result).toEqual({ score: 0 });
  });
});
