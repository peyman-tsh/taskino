import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IncreaseScoreDto } from './dto/increase-score.dto';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  private readonly bcryptSaltRounds: number;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {
    this.bcryptSaltRounds =
      this.configService.get<number>('app.bcryptSaltRounds') ?? 10;
  }

  /**
   * Create a new user (password should already be hashed by AuthService)
   */
  async create(
    createUserDto: CreateUserDto,
    hashedPassword?: string,
  ): Promise<UserDocument> {
    const { email, password, ...rest } = createUserDto;

    const existingUser = await this.userModel.findOne({ email }).exec();

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const createdUser = new this.userModel({
      ...rest,
      email,
      password: hashedPassword || password,
    });

    return createdUser.save();
  }

  /**
   * Find all users with pagination
   */

  async findByName(userName:string,lastname:string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ firstName: userName, lastName:lastname }).exec(); 
    if (!user) {
      throw new NotFoundException('User not found');
    }
   return user;
  }
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Omit<UserDocument, 'password'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.userModel.find().skip(skip).limit(limit).exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async countActiveUsers(): Promise<number> {
    return this.userModel.countDocuments({ isActive: true }).exec();
  }

  async findProfilesByIds(userIds: string[]) {
    const validUserIds = userIds.filter((userId) =>
      Types.ObjectId.isValid(userId),
    );
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
    const invalidUserIds = uniqueUserIds.filter(
      (userId) => !Types.ObjectId.isValid(userId),
    );
    if (invalidUserIds.length > 0) {
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
    const invalidUserIds = uniqueUserIds.filter(
      (userId) => !Types.ObjectId.isValid(userId),
    );
    if (invalidUserIds.length > 0) {
      throw new BadRequestException('Invalid user IDs');
    }

    const existingUsersCount = await this.userModel
      .countDocuments({
        _id: { $in: uniqueUserIds.map((userId) => new Types.ObjectId(userId)) },
      })
      .exec();

    if (existingUsersCount !== uniqueUserIds.length) {
      throw new NotFoundException('One or more users were not found');
    }
  }

  async findForManager(
    page: number = 1,
    limit: number = 10,
    filters?: {
      isActive?: boolean;
      role?: UserRole;
      name?: string;
    },
  ): Promise<{
    data: Omit<UserDocument, 'password'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.role) {
      query.roles = filters.role;
    }

    const nameTerms = filters?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (nameTerms.length > 0) {
      query.$and = nameTerms.map((term) => {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const namePattern = new RegExp(escapedTerm, 'i');
        return {
          $or: [{ firstName: namePattern }, { lastName: namePattern }],
        };
      });
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find a user by mobile number (with password for authentication)
   */
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

  /**
   * Update a user by ID
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { email, password } = updateUserDto;

    if (email && email !== user.email) {
      const existingUser = await this.userModel.findOne({ email }).exec();

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    const updateData: Record<string, unknown> = {};

    if (updateUserDto.firstName !== undefined) {
      updateData.firstName = updateUserDto.firstName;
    }

    if (updateUserDto.lastName !== undefined) {
      updateData.lastName = updateUserDto.lastName;
    }

    if (updateUserDto.mobile !== undefined) {
      updateData.mobile = updateUserDto.mobile;
    }

    if (email && email !== user.email) {
      updateData.email = email;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, this.bcryptSaltRounds);
    }

    await this.userModel
      .findByIdAndUpdate(
        id,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    const updatedUser = await this.findById(id);

    console.log(updateData.mobile, updatedUser.mobile);
    return updatedUser;
  }

  async updateRole(
    id: string,
    role: UserRole | string,
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          roles: role,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Delete a user by ID
   */
  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async approveExpert(userId: string) {
    console.log('in');

    const user = await this.userModel.findById(userId);
    console.log(user);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      return {
        message: 'User is already approved',
        user,
      };
    }

    user.isActive = true;
    await user.save();

    return {
      message: 'User approved successfully',
      user,
    };
  }

  /**
   * Increase user score by a specified amount
   */
  async increaseScore(dto: IncreaseScoreDto): Promise<UserDocument> {
    const { userId, score } = dto;

    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.score = (user.score || 0) + score;
    await user.save();

    return user;
  }
}
