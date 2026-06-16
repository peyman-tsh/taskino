import { Connection, Model, Types } from 'mongoose';
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
      { new: true, updatePipeline: true },
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
      { new: true, session: undefined, updatePipeline: true },
    );
  });

  it('counts only active fixed tasks in work summary', async () => {
    const userId = new Types.ObjectId().toString();
    const exec = jest.fn().mockResolvedValue({ score: 30 });
    const lean = jest.fn().mockReturnValue({ exec });
    const select = jest.fn().mockReturnValue({ lean });
    const findById = jest.fn().mockReturnValue({ select });
    const countDocuments = jest.fn().mockResolvedValue(0);
    const collection = jest.fn().mockReturnValue({ countDocuments });
    const repository = new UserRepository(
      { findById } as unknown as Model<UserDocument>,
      { collection } as unknown as Connection,
    );

    await repository.findUserWorkSummary(userId);

    expect(countDocuments).toHaveBeenCalledWith({
      assignedTo: expect.any(Types.ObjectId),
      isActive: true,
    });
    expect(countDocuments).toHaveBeenCalledWith({
      assignedTo: expect.any(Types.ObjectId),
      isActive: true,
      status: 'done',
    });
  });
});
