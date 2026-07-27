import {
  BadRequestException,
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
import {
  buildDailyProgressRange,
  getTehranDayRange,
  parseTehranDayBoundary,
} from '../../common/utils/daily-progress-range.util';
import { TaskStatus } from '../../task/task.schema';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';

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

  findActiveManagerAndSupervisorIdsByWorkField(
    workField: WorkField,
  ): Promise<string[]> {
    return this.userRepository.findActiveManagerAndSupervisorIdsByWorkField(
      workField,
    );
  }

  async findActiveManagerIdsForUser(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userRepository.findRawById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.findActiveManagerIdsByWorkField(user.workField);
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

  async findForManagerWorkField(
    managerId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { role?: UserRole; name?: string },
  ): Promise<{
    data: Omit<UserDocument, 'password'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new NotFoundException('Invalid manager ID');
    }

    const manager = await this.userRepository.findRawById(managerId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    return this.userRepository.findForManager(page, limit, {
      ...filters,
      isActive: true,
      workField: manager.workField,
    });
  }

  async findAllForManagerWorkField(
    managerId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { role?: UserRole; name?: string },
  ): Promise<{
    data: Omit<UserDocument, 'password'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new NotFoundException('Invalid manager ID');
    }

    const manager = await this.userRepository.findRawById(managerId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    return this.userRepository.findForManager(page, limit, {
      ...filters,
      workField: manager.workField,
    });
  }

  async findUsersByManagerWorkField(
    managerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Omit<UserDocument, 'password'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new NotFoundException('Invalid manager ID');
    }

    const manager = await this.userRepository.findRawById(managerId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    return this.userRepository.findByWorkField(manager.workField, page, limit);
  }

  async getCompletionRatings(managerId: string) {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new NotFoundException('Invalid manager ID');
    }

    const manager = await this.userRepository.findRawById(managerId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const users = await this.userRepository.findCompletionCountsByWorkField(
      manager.workField,
    );
    const sortedUsers = users
      .map((user) => ({
        ...user,
        totalCompleted: user.completedTasks + user.completedFixedTasks,
      }))
      .sort(
        (first, second) =>
          second.totalCompleted - first.totalCompleted ||
          first.firstName.localeCompare(second.firstName) ||
          first.lastName.localeCompare(second.lastName),
      );
    const highestCompleted = sortedUsers[0]?.totalCompleted ?? 0;

    return {
      total: sortedUsers.length,
      data: sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
        completionRate:
          highestCompleted === 0
            ? 0
            : Number(
                ((user.totalCompleted / highestCompleted) * 100).toFixed(2),
              ),
      })),
    };
  }

  async getAllTimeStartScoresForManager(managerId: string) {
    if (!Types.ObjectId.isValid(managerId)) {
      throw new NotFoundException('Invalid manager ID');
    }

    const manager = await this.userRepository.findRawById(managerId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const users =
      await this.userRepository.findSpecialistsAndSupervisorsByWorkField(
        manager.workField,
      );
    const now = new Date();
    const data = await Promise.all(
      users.map(async (user) => {
        const work = await this.userRepository.findWorkForDailyProgressRange(
          new Types.ObjectId(user.userId),
          new Date(0),
          now,
        );
        const progressPercentage = this.calculateAllTimeProgressPercentage(
          work.tasks,
          work.fixedTasks,
        );

        return {
          ...user,
          startScore: this.calculateStartScore(progressPercentage),
        };
      }),
    );

    return { total: data.length, data };
  }

  findIdsByWorkField(workField: WorkField): Promise<string[]> {
    return this.userRepository.findIdsByWorkField(workField);
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
    taskProgressPercentage: number;
    fixedTaskProgressPercentage: number;
    progressPercentage: number;
    progressDate?: Date;
    performanceStatus: UserPerformanceStatus;
    score: number;
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
      taskProgressPercentage: progress.taskProgressPercentage,
      fixedTaskProgressPercentage: progress.fixedTaskProgressPercentage,
      progressPercentage: progress.progressPercentage,
      progressDate: progress.progressDate,
      performanceStatus,
      score: progress.score,
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

  async getMyDailyProgress(
    userId: string,
    fromValue: string,
    toValue: string,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userRepository.findSpecialistProgressById(userId);
    if (!user) {
      throw new NotFoundException('Specialist or supervisor user not found');
    }

    const from = parseTehranDayBoundary(fromValue);
    const to = parseTehranDayBoundary(toValue);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }

    const rangeEnd = getTehranDayRange(to).periodEnd;
    const work = await this.userRepository.findWorkForDailyProgressRange(
      new Types.ObjectId(userId),
      from,
      rangeEnd,
    );
    const allTimeWork = await this.userRepository.findWorkForDailyProgressRange(
      new Types.ObjectId(userId),
      new Date(0),
      new Date(),
    );
    const tasksByDay = this.groupWorkByTehranDay(work.tasks);
    const fixedTasksByDay = this.groupWorkByTehranDay(work.fixedTasks);
    const dailyDates = buildDailyProgressRange(from, to, []).data;
    const data = dailyDates.map((day) =>
      this.calculateDailyProgress(
        tasksByDay.get(day.date.toISOString()) ?? [],
        fixedTasksByDay.get(day.date.toISOString()) ?? [],
      ),
    );
    const average = (selector: (record: (typeof data)[number]) => number) =>
      Number(
        (
          data.reduce((sum, record) => sum + selector(record), 0) /
          data.length
        ).toFixed(2),
      );
    const taskProgressPercentage = average(
      (record) => record.taskProgressPercentage ?? 0,
    );
    const fixedTaskProgressPercentage = average(
      (record) => record.fixedTaskProgressPercentage ?? 0,
    );
    const progressPercentage =
      work.tasks.length > 0 && work.fixedTasks.length > 0
        ? Math.round(
            (taskProgressPercentage + fixedTaskProgressPercentage) / 2,
          )
        : work.tasks.length > 0
          ? taskProgressPercentage
          : fixedTaskProgressPercentage;
    const doneTaskPercentage = this.calculateRatingPercentage(
      work.tasks.filter((task) => task.status === TaskStatus.DONE),
    );
    const allTimeProgressPercentage = this.calculateAllTimeProgressPercentage(
      allTimeWork.tasks,
      allTimeWork.fixedTasks,
    );

    return {
      userId,
      from,
      to,
      dayCount: data.length,
      averageProgressPercentage: progressPercentage,
      doneTaskPercentage,
      totalTasks: average((record) => record.totalTasks ?? 0),
      completedTasks: average((record) => record.completedTasks ?? 0),
      totalFixedTasks: average((record) => record.totalFixedTasks ?? 0),
      completedFixedTasks: average(
        (record) => record.completedFixedTasks ?? 0,
      ),
      taskProgressPercentage,
      fixedTaskProgressPercentage,
      doneFixedTaskProgressPercentage: average(
        (record) => record.doneFixedTaskProgressPercentage,
      ),
      progressPercentage,
      startScore: this.calculateStartScore(allTimeProgressPercentage),
      performanceStatus: calculatePerformanceStatus(progressPercentage),
    };
  }

  private groupWorkByTehranDay<
    T extends { startDate?: Date; status: string; ratingScore?: number | null },
  >(items: T[]): Map<string, T[]> {
    const workByDay = new Map<string, T[]>();

    for (const item of items) {
      if (!(item.startDate instanceof Date)) continue;

      const key = getTehranDayRange(item.startDate).periodStart.toISOString();
      const dayItems = workByDay.get(key) ?? [];
      dayItems.push(item);
      workByDay.set(key, dayItems);
    }

    return workByDay;
  }

  private calculateDailyProgress(
    tasks: Array<{ status: TaskStatus; ratingScore?: number | null }>,
    fixedTasks: Array<{
      status: FixedTaskStatus;
      ratingScore?: number | null;
    }>,
  ) {
    const taskProgressPercentage = this.calculateWorkProgressPercentage(
      tasks,
      TaskStatus.DONE,
    );
    const fixedTaskProgressPercentage = this.calculateWorkProgressPercentage(
      fixedTasks,
      FixedTaskStatus.DONE,
    );
    const hasTasks = tasks.length > 0;
    const hasFixedTasks = fixedTasks.length > 0;
    const progressPercentage = hasTasks && hasFixedTasks
      ? Math.round((taskProgressPercentage + fixedTaskProgressPercentage) / 2)
      : hasTasks
        ? taskProgressPercentage
        : fixedTaskProgressPercentage;

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.status === TaskStatus.DONE)
        .length,
      totalFixedTasks: fixedTasks.length,
      completedFixedTasks: fixedTasks.filter(
        (task) => task.status === FixedTaskStatus.DONE,
      ).length,
      taskProgressPercentage,
      fixedTaskProgressPercentage,
      doneFixedTaskProgressPercentage: this.calculateRatingPercentage(
        fixedTasks.filter((task) => task.status === FixedTaskStatus.DONE),
      ),
      progressPercentage,
    };
  }

  private calculateAllTimeProgressPercentage(
    tasks: Array<{ status: TaskStatus }>,
    fixedTasks: Array<{ status: FixedTaskStatus }>,
  ): number {
    const taskProgressPercentage = this.calculateWorkProgressPercentage(
      tasks,
      TaskStatus.DONE,
    );
    const fixedTaskProgressPercentage = this.calculateWorkProgressPercentage(
      fixedTasks,
      FixedTaskStatus.DONE,
    );

    if (tasks.length > 0 && fixedTasks.length > 0) {
      return Math.round(
        (taskProgressPercentage + fixedTaskProgressPercentage) / 2,
      );
    }

    return tasks.length > 0
      ? taskProgressPercentage
      : fixedTaskProgressPercentage;
  }

  private calculateRatingPercentage(
    items: Array<{ ratingScore?: number | null }>,
  ): number {
    if (items.length === 0) return 0;

    const totalRating = items.reduce((sum, item) => {
      const rating = Number(item.ratingScore);
      return sum +
        (Number.isFinite(rating) ? Math.min(Math.max(rating, 0), 5) : 0);
    }, 0);

    return Number(((totalRating / (items.length * 5)) * 100).toFixed(2));
  }

  private calculateWorkProgressPercentage(
    items: Array<{ status: string; ratingScore?: number | null }>,
    doneStatus: TaskStatus.DONE | FixedTaskStatus.DONE,
  ): number {
    if (items.length === 0) return 0;

    const doneCount = items.filter((item) => item.status === doneStatus).length;
    return Math.round((doneCount / items.length) * 100);
  }

  private calculateStartScore(progressPercentage: number): number {
    return progressPercentage / 20;
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
      throw new NotFoundException('Specialist or supervisor user not found');
    }

    return user;
  }

  async getSpecialistOrSupervisorScore(userId: string): Promise<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    score: number;
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const userScore =
      await this.userRepository.findSpecialistOrSupervisorScoreById(userId);
    if (!userScore) {
      throw new NotFoundException('Specialist or supervisor user not found');
    }

    return userScore;
  }
}
