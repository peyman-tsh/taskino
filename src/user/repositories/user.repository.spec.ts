import { Model } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
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
});
