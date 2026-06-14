import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { WorkField } from '../../common/enums/work-field.enum';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  create(data: Record<string, unknown>): Promise<UserDocument> {
    return new this.userModel(data).save();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  findRawById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  updateById(id: string, update: Record<string, unknown>) {
    return this.userModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  adjustScoreWithFloor(id: string, score: number) {
    return this.userModel
      .findByIdAndUpdate(
        id,
        [
          {
            $set: {
              score: {
                $max: [0, { $add: [{ $ifNull: ['$score', 0] }, score] }],
              },
            },
          },
        ],
        { new: true },
      )
      .exec();
  }

  adjustSpecialistScoreWithFloor(
    id: string,
    score: number,
    session?: ClientSession,
  ) {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, roles: UserRole.SPECIALIST },
        [
          {
            $set: {
              score: {
                $max: [0, { $add: [{ $ifNull: ['$score', 0] }, score] }],
              },
            },
          },
        ],
        { new: true, session },
      )
      .exec();
  }

  deleteById(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async findByName(firstName: string, lastName: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ firstName, lastName }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel.find().skip(skip).limit(limit).exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return { data, total, page, limit };
  }

  countActiveUsers(): Promise<number> {
    return this.userModel.countDocuments({ isActive: true }).exec();
  }

  async findActiveManagerIdsByWorkField(
    workField: WorkField,
  ): Promise<string[]> {
    const managers = await this.userModel
      .find({
        roles: UserRole.MANAGER,
        workField,
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    return managers.map((manager) => manager._id.toString());
  }

  async findProfilesByIds(userIds: string[]) {
    const validUserIds = userIds.filter(Types.ObjectId.isValid);
    if (validUserIds.length === 0) {
      return [];
    }

    const users = await this.userModel
      .find({
        _id: { $in: validUserIds.map((userId) => new Types.ObjectId(userId)) },
      })
      .select('firstName lastName email mobile isActive score')
      .lean()
      .exec();

    return users.map((user) => ({
      userId: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      isActive: user.isActive,
      score: user.score ?? 0,
    }));
  }

  async findTaskParticipantsByIds(userIds: string[]) {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.some((userId) => !Types.ObjectId.isValid(userId))) {
      throw new BadRequestException('Invalid task participant user IDs');
    }

    const users = await this.userModel
      .find({
        _id: { $in: uniqueUserIds.map((userId) => new Types.ObjectId(userId)) },
      })
      .select('roles workField isActive')
      .lean()
      .exec();

    if (users.length !== uniqueUserIds.length) {
      throw new NotFoundException(
        'One or more task participants were not found',
      );
    }

    return users.map((user) => ({
      userId: user._id.toString(),
      role: user.roles,
      workField: user.workField,
      isActive: user.isActive,
    }));
  }

  async assertUsersExist(userIds: string[]): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.some((userId) => !Types.ObjectId.isValid(userId))) {
      throw new BadRequestException('Invalid user IDs');
    }

    const count = await this.userModel
      .countDocuments({
        _id: { $in: uniqueUserIds.map((userId) => new Types.ObjectId(userId)) },
      })
      .exec();

    if (count !== uniqueUserIds.length) {
      throw new NotFoundException('One or more users were not found');
    }
  }

  async findForManager(
    page = 1,
    limit = 10,
    filters?: { isActive?: boolean; role?: UserRole; name?: string },
  ) {
    const query: Record<string, unknown> = {};
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;
    if (filters?.role) query.roles = filters.role;

    const terms = filters?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (terms.length > 0) {
      query.$and = terms.map((term) => {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escapedTerm, 'i');
        return { $or: [{ firstName: pattern }, { lastName: pattern }] };
      });
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByMobile(mobile: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ mobile })
      .select('+password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
