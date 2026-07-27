import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  UserPerformanceStatus,
  UserRole,
} from '../schemas/user.schema';
import { WorkField } from '../../common/enums/work-field.enum';
import { DailyProgressRecord } from '../../common/utils/daily-progress-range.util';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';

interface DoneFixedTaskRatingProgress {
  date: Date;
  averagePercentage: number;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  create(data: Record<string, unknown>): Promise<UserDocument> {
    return new this.userModel(data).save();
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  findOptionalByMobile(mobile: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ mobile }).exec();
  }

  findRawById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  updateById(id: string, update: Record<string, unknown>) {
    return this.userModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  updatePasswordHash(id: string, password: string) {
    return this.userModel
      .findByIdAndUpdate(id, { $set: { password } })
      .exec();
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
        { new: true, updatePipeline: true },
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
        { _id: id, roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] } },
        [
          {
            $set: {
              score: {
                $max: [0, { $add: [{ $ifNull: ['$score', 0] }, score] }],
              },
            },
          },
        ],
        { new: true, session, updatePipeline: true },
      )
      .exec();
  }

  async findSpecialistOrSupervisorScoreById(id: string): Promise<{
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    score: number;
  } | null> {
    const user = await this.userModel
      .findOne({
        _id: id,
        roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
      })
      .select('firstName lastName email roles score')
      .lean()
      .exec();

    if (!user) return null;

    return {
      userId: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roles,
      score: user.score ?? 0,
    };
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

  async findActiveManagerAndSupervisorIdsByWorkField(
    workField: WorkField,
  ): Promise<string[]> {
    const users = await this.userModel
      .find({
        roles: { $in: [UserRole.MANAGER, UserRole.SUPERVISOR] },
        workField,
        isActive: true,
      })
      .select('_id')
      .lean()
      .exec();

    return users.map((user) => user._id.toString());
  }

  async findSpecialistsAndSupervisorsByWorkField(workField: WorkField): Promise<
    Array<{
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      role: UserRole;
      isActive: boolean;
    }>
  > {
    const users = await this.userModel
      .find({
        workField,
        roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
        isActive: true,
      })
      .select('_id firstName lastName email roles isActive')
      .sort({ firstName: 1, lastName: 1, _id: 1 })
      .lean()
      .exec();

    return users.map((user) => ({
      userId: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.roles as UserRole,
      isActive: user.isActive,
    }));
  }

  async findCompletionCountsByWorkField(workField: WorkField): Promise<
    Array<{
      userId: string;
      firstName: string;
      lastName: string;
      completedTasks: number;
      completedFixedTasks: number;
    }>
  > {
    const users = await this.userModel
      .find({
        roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
        workField,
        isActive: true,
      })
      .select('_id firstName lastName')
      .lean()
      .exec();
    const userIds = users.map((user) => user._id);
    if (userIds.length === 0) return [];

    const [taskCounts, fixedTaskCounts] = await Promise.all([
      this.connection
        .collection('tasks')
        .aggregate([
          { $match: { assignedTo: { $in: userIds }, status: 'done' } },
          { $unwind: '$assignedTo' },
          { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        ])
        .toArray(),
      this.connection
        .collection('fixedtasktemplates')
        .aggregate([
          {
            $match: {
              assignedTo: { $in: userIds },
              isTemplate: { $ne: true },
              status: 'done',
            },
          },
          { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);
    const taskCountByUserId = new Map(
      taskCounts.map((item) => [item._id.toString(), item.count as number]),
    );
    const fixedTaskCountByUserId = new Map(
      fixedTaskCounts.map((item) => [
        item._id.toString(),
        item.count as number,
      ]),
    );

    return users.map((user) => ({
      userId: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      completedTasks: taskCountByUserId.get(user._id.toString()) ?? 0,
      completedFixedTasks: fixedTaskCountByUserId.get(user._id.toString()) ?? 0,
    }));
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
    filters?: {
      isActive?: boolean;
      role?: UserRole;
      name?: string;
      workField?: WorkField;
    },
  ) {
    const query: Record<string, unknown> = {};
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;
    if (filters?.role) query.roles = filters.role;
    if (filters?.workField) query.workField = filters.workField;

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

  async findByWorkField(workField: WorkField, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const query = { workField };
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

  async findIdsByWorkField(workField: WorkField): Promise<string[]> {
    const users = await this.userModel
      .find({ workField })
      .select('_id')
      .lean()
      .exec();

    return users.map((user) => user._id.toString());
  }

  async findById(id: string): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findSpecialistProgressById(
    id: string,
  ): Promise<{
    userId: string;
    taskProgressPercentage: number;
    fixedTaskProgressPercentage: number;
    progressPercentage: number;
    progressDate?: Date;
    performanceStatus: UserPerformanceStatus;
    score: number;
  } | null> {
    const user = await this.userModel
      .findOne({
        _id: id,
        roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
      })
      .select(
        'taskProgressPercentage fixedTaskProgressPercentage progressPercentage progressDate performanceStatus score',
      )
      .lean()
      .exec();

    if (!user) {
      return null;
    }

    return {
      userId: user._id.toString(),
      taskProgressPercentage: user.taskProgressPercentage ?? 0,
      fixedTaskProgressPercentage: user.fixedTaskProgressPercentage ?? 0,
      progressPercentage: user.progressPercentage ?? 0,
      progressDate: user.progressDate,
      performanceStatus:
        user.performanceStatus ?? UserPerformanceStatus.WEAK,
      score: user.score ?? 0,
    };
  }

  async findDailyProgressByUser(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<DailyProgressRecord[]> {
    const records = await this.connection
      .collection('userdailyprogresses')
      .find({
        userId,
        date: {
          $gte: from,
          $lte: to,
        },
      })
      .sort({ date: 1 })
      .toArray();

    return records as unknown as DailyProgressRecord[];
  }

  async findWorkForDailyProgressRange(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<{
    tasks: Array<{
      startDate?: Date;
      status: TaskStatus;
      ratingScore?: number | null;
    }>;
    fixedTasks: Array<{
      startDate?: Date;
      status: FixedTaskStatus;
      ratingScore?: number | null;
    }>;
  }> {
    const [tasks, fixedTasks] = await Promise.all([
      this.connection
        .collection('tasks')
        .find({
          assignedTo: userId,
          startDate: { $gte: from, $lt: to },
        })
        .project({ startDate: 1, status: 1, ratingScore: 1 })
        .toArray(),
      this.connection
        .collection('fixedtasktemplates')
        .find({
          assignedTo: userId,
          isTemplate: { $ne: true },
          startDate: { $gte: from, $lt: to },
        })
        .project({ startDate: 1, status: 1, ratingScore: 1 })
        .toArray(),
    ]);

    return {
      tasks: tasks as Array<{
        startDate?: Date;
        status: TaskStatus;
        ratingScore?: number | null;
      }>,
      fixedTasks: fixedTasks as Array<{
        startDate?: Date;
        status: FixedTaskStatus;
        ratingScore?: number | null;
      }>,
    };
  }

  async findDoneFixedTaskRatingProgress(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<DoneFixedTaskRatingProgress[]> {
    const fixedTasks = await this.connection
      .collection('fixedtasktemplates')
      .find({
        assignedTo: userId,
        status: FixedTaskStatus.DONE,
        isTemplate: { $ne: true },
        startDate: { $gte: from, $lte: to },
      })
      .project({ startDate: 1, ratingScore: 1 })
      .toArray();

    const ratingsByDay = new Map<string, { date: Date; total: number; count: number }>();

    for (const fixedTask of fixedTasks) {
      if (!(fixedTask.startDate instanceof Date)) continue;

      const key = fixedTask.startDate.toISOString();
      const rating = Number(fixedTask.ratingScore);
      const item = ratingsByDay.get(key) ?? {
        date: fixedTask.startDate,
        total: 0,
        count: 0,
      };

      item.total += Number.isFinite(rating)
        ? Math.min(Math.max(rating, 0), 5)
        : 0;
      item.count += 1;
      ratingsByDay.set(key, item);
    }

    return [...ratingsByDay.values()].map(({ date, total, count }) => ({
      date,
      averagePercentage: Number(((total / count / 5) * 100).toFixed(2)),
    }));
  }

  async calculateDoneTaskPercentage(
    userId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<number> {
    const tasks = await this.connection
      .collection('tasks')
      .find({
        assignedTo: userId,
        status: TaskStatus.DONE,
        startDate: { $gte: from, $lte: to },
      })
      .project({ ratingScore: 1 })
      .toArray();

    if (tasks.length === 0) return 0;

    const totalRating = tasks.reduce((sum, task) => {
      const rating = Number(task.ratingScore);
      return sum +
        (Number.isFinite(rating) ? Math.min(Math.max(rating, 0), 5) : 0);
    }, 0);

    return Number(((totalRating / (tasks.length * 5)) * 100).toFixed(2));
  }

  updatePerformanceStatus(
    id: string,
    performanceStatus: UserPerformanceStatus,
  ) {
    return this.userModel
      .updateOne({ _id: id }, { $set: { performanceStatus } })
      .exec();
  }

  async findUserWorkSummary(id: string): Promise<{
    userId: string;
    totalTasks: number;
    completedTasks: number;
    totalFixedTasks: number;
    completedFixedTasks: number;
    score: number;
  } | null> {
    const userObjectId = new Types.ObjectId(id);
    const [user, totalTasks, completedTasks, totalFixedTasks, completedFixedTasks] =
      await Promise.all([
        this.userModel.findById(userObjectId).select('score').lean().exec(),
        this.connection
          .collection('tasks')
          .countDocuments({ assignedTo: userObjectId }),
        this.connection.collection('tasks').countDocuments({
          assignedTo: userObjectId,
          status: 'done',
        }),
        this.connection
          .collection('fixedtasktemplates')
          .countDocuments({ assignedTo: userObjectId, isActive: true }),
        this.connection.collection('fixedtasktemplates').countDocuments({
          assignedTo: userObjectId,
          isActive: true,
          status: 'done',
        }),
      ]);

    if (!user) return null;

    return {
      userId: id,
      totalTasks,
      completedTasks,
      totalFixedTasks,
      completedFixedTasks,
      score: user.score ?? 0,
    };
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
