import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { IncreaseScoreDto } from '../dto/increase-score.dto';
import { UserDocument, UserRole } from '../schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { WorkField } from '../../common/enums/work-field.enum';

@Injectable()
export class UserService {
  private readonly bcryptSaltRounds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
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

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    return this.userRepository.create({
      ...rest,
      email,
      password: hashedPassword || password,
    });
  }

  /**
   * Find all users with pagination
   */

  findByName(userName: string, lastName: string): Promise<UserDocument> {
    return this.userRepository.findByName(userName, lastName);
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
    return this.userRepository.findAll(page, limit);
  }

  async countActiveUsers(): Promise<number> {
    return this.userRepository.countActiveUsers();
  }

  findActiveManagerIdsByWorkField(workField: WorkField): Promise<string[]> {
    return this.userRepository.findActiveManagerIdsByWorkField(workField);
  }

  async findProfilesByIds(userIds: string[]) {
    return this.userRepository.findProfilesByIds(userIds);
  }

  async findTaskParticipantsByIds(userIds: string[]) {
    return this.userRepository.findTaskParticipantsByIds(userIds);
  }

  async assertUsersExist(userIds: string[]): Promise<void> {
    return this.userRepository.assertUsersExist(userIds);
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
    return this.userRepository.findForManager(page, limit, filters);
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<Omit<UserDocument, 'password'>> {
    return this.userRepository.findById(id);
  }

  async getSpecialistProgress(
    userId: string,
  ): Promise<{ userId: string; progressPercentage: number }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const progress = await this.userRepository.findSpecialistProgressById(
      userId,
    );
    if (!progress) {
      throw new NotFoundException('Specialist user not found');
    }

    return progress;
  }

  /**
   * Find a user by mobile number (with password for authentication)
   */
  async findByMobile(mobile: string): Promise<UserDocument> {
    return this.userRepository.findByMobile(mobile);
  }

  /**
   * Update a user by ID
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userRepository.findRawById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { email, password } = updateUserDto;

    if (email && email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(email);

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

    await this.userRepository.updateById(id, {
      ...updateData,
      updatedAt: new Date(),
    });

    const updatedUser = await this.findById(id);

    return updatedUser;
  }

  async updateRole(
    id: string,
    role: UserRole | string,
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userRepository.updateById(id, {
      roles: role,
      updatedAt: new Date(),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Delete a user by ID
   */
  async delete(id: string): Promise<void> {
    const result = await this.userRepository.deleteById(id);

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async approveExpert(userId: string) {
    const user = await this.userRepository.findRawById(userId);

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

    const user = await this.userRepository.adjustScoreWithFloor(userId, score);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async adjustSpecialistScore(
    userId: string,
    score: number,
    session?: ClientSession,
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) {
      return false;
    }

    const user = await this.userRepository.adjustSpecialistScoreWithFloor(
      userId,
      score,
      session,
    );
    return Boolean(user);
  }

  async adjustSpecialistScoreManually(
    userId: string,
    score: number,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userRepository.adjustSpecialistScoreWithFloor(
      userId,
      score,
    );

    if (!user) {
      throw new NotFoundException('Specialist user not found');
    }

    return user;
  }
}
