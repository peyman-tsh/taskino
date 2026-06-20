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
import {
  UserDocument,
  UserPerformanceStatus,
  UserRole,
} from '../schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { WorkField } from '../../common/enums/work-field.enum';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../../common/events/user-progress.events';
import { calculatePerformanceStatus } from '../../common/utils/performance-status.util';

@Injectable()
export class UserService {
  private readonly bcryptSaltRounds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly eventBus: InternalEventBus,
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

  findOptionalByMobile(mobile: string): Promise<UserDocument | null> {
    return this.userRepository.findOptionalByMobile(mobile);
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    const user = await this.userRepository.updatePasswordHash(
      userId,
      passwordHash,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
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
  ): Promise<{
    userId: string;
    progressPercentage: number;
    performanceStatus: UserPerformanceStatus;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    await this.eventBus.publishAndWait(
      UserProgressEvents.REFRESH_REQUESTED,
      new UserProgressRefreshRequestedEvent([userId]),
    );

    const progress = await this.userRepository.findSpecialistProgressById(
      userId,
    );
    if (!progress) {
      throw new NotFoundException('Specialist or supervisor user not found');
    }

    const performanceStatus = calculatePerformanceStatus(
      progress.progressPercentage,
    );
    if (progress.performanceStatus !== performanceStatus) {
      await this.userRepository.updatePerformanceStatus(
        userId,
        performanceStatus,
      );
    }

    return {
      userId: progress.userId,
      progressPercentage: progress.progressPercentage,
      performanceStatus,
    };
  }

  async getMyWorkSummary(userId: string): Promise<{
    userId: string;
    totalTasks: number;
    completedTasks: number;
    totalFixedTasks: number;
    completedFixedTasks: number;
    score: number;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const summary = await this.userRepository.findUserWorkSummary(userId);
    if (!summary) {
      throw new NotFoundException('User not found');
    }

    return summary;
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
