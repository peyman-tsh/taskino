import { Model } from 'mongoose';
import { UserDocument, UserRole } from '../schemas/user.schema';
import { UserRepository } from './user.repository';

describe('UserRepository score adjustment', () => {
  it('uses zero as the minimum score', async () => {
    const exec = jest.fn().mockResolvedValue({ score: 0 });
    const findByIdAndUpdate = jest.fn().mockReturnValue({ exec });
    const repository = new UserRepository({
      findByIdAndUpdate,
    } as unknown as Model<UserDocument>);

    await repository.adjustScoreWithFloor('user-id', -10);

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'user-id',
      [
        {
          $set: {
            score: {
              $max: [0, { $add: [{ $ifNull: ['$score', 0] }, -10] }],
            },
          },
        },
      ],
      { new: true },
    );
  });

  it('adjusts score only when the target user is a specialist', async () => {
    const exec = jest.fn().mockResolvedValue({ score: 10 });
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec });
    const repository = new UserRepository({
      findOneAndUpdate,
    } as unknown as Model<UserDocument>);

    await repository.adjustSpecialistScoreWithFloor('user-id', 10);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'user-id', roles: UserRole.SPECIALIST },
      [
        {
          $set: {
            score: {
              $max: [0, { $add: [{ $ifNull: ['$score', 0] }, 10] }],
            },
          },
        },
      ],
      { new: true, session: undefined },
    );
  });
});
