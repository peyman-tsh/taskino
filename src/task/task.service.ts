import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCompletionStatsDto } from './dto/task-count.dto';
import { Task, TaskDocument, TaskStatus, TaskSchema } from './task.schema';
import { ExcelService } from '../excel/excel.service';
import { ExcelFile, ExcelType } from '../excel/excel.schema';
import { DateCountDto } from './dto/dateCount.dto';
import { UserService } from 'src/user/user.service';

// Constants
const EXCEL_IMPORT_TYPE = 'import' as ExcelType;

/**
 * Task Service
 * Handles CRUD operations for tasks with pagination and filtering.
 */
@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    private readonly excelService: ExcelService,
    private readonly userService: UserService,
  ) {}

  /**
   * Validates if a given ID is a valid MongoDB ObjectId.
   * @throws BadRequestException if the ID is invalid.
   */
  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID: ${id}`);
    }
  }

  /**
   * Normalize assignedTo to always be an array of strings.
   */
  private normalizeAssignedTo(assignedTo: string | string[] | undefined): string[] {
    if (Array.isArray(assignedTo)) {
      return assignedTo;
    }
    return assignedTo ? [assignedTo] : [];
  }

  /**
   * Create a new task
   */
  async create(createTaskDto: CreateTaskDto, file?: Express.Multer.File): Promise<TaskDocument | {
    task: TaskDocument;
    excelUpload: ExcelFile;
  }> {
    const { createdBy, assignedTo, projectId, ...rest } = createTaskDto;

    // Validate createdBy
    this.validateObjectId(createdBy);

    // Normalize and validate assignedTo
    const assignedToArray = this.normalizeAssignedTo(assignedTo);
    if (assignedToArray.length > 0) {
      const invalidIds = assignedToArray.filter((userId) => !Types.ObjectId.isValid(userId));
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid assignedTo user IDs');
      }
    }

    if (projectId) {
      this.validateObjectId(projectId);
    }

    const createdTask = new this.taskModel({
      ...rest,
      createdBy: new Types.ObjectId(createdBy),
      assignedTo: assignedToArray.map((userId) => new Types.ObjectId(userId)),
      projectId: projectId ? new Types.ObjectId(projectId) : undefined,
    });

    // Handle file upload if provided
    if (file) {
      const excelUpload = await this.excelService.uploadFile(file, createdBy, EXCEL_IMPORT_TYPE);
      createdTask.file = excelUpload.fileName;
      return {
        task: await createdTask.save(),
        excelUpload,
      };
    }

    return createdTask.save();
  }

  /**
   * Find all tasks with pagination and optional filters
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      createdBy?: string;
      assignedTo?: string;
      status?: TaskStatus;
    },
  ): Promise<{
    data: TaskDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (filters?.createdBy && Types.ObjectId.isValid(filters.createdBy)) {
      query.createdBy = new Types.ObjectId(filters.createdBy);
    }
    if (filters?.assignedTo && Types.ObjectId.isValid(filters.assignedTo)) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }
    if (filters?.status) {
      query.status = filters.status;
    }

    const [data, total] = await Promise.all([
      this.taskModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .exec(),
      this.taskModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Find a task by ID with populated user fields
   * @throws NotFoundException if task not found
   */
  async findById(id: string): Promise<TaskDocument> {
    this.validateObjectId(id);

    const task = await this.taskModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  /**
   * Update a task by ID with only provided fields
   * @throws NotFoundException if task not found
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<TaskDocument> {
    this.validateObjectId(id);

    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Build update object only with defined values
    const updateData: Record<string, unknown> = Object.fromEntries(
      Object.entries(updateTaskDto).filter(([_, value]) => value !== undefined),
    );

    // Validate and convert assignedTo if provided
    if (updateTaskDto.assignedTo !== undefined) {
      const invalidIds = updateTaskDto.assignedTo.filter((userId) => !Types.ObjectId.isValid(userId));
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid assignedTo user IDs');
      }
      updateData.assignedTo = updateTaskDto.assignedTo.map((userId) => new Types.ObjectId(userId));
    }

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    if (!updatedTask) {
      throw new NotFoundException('Task not found');
    }

    return updatedTask;
  }

  /**
   * Delete a task by ID
   * @throws NotFoundException if task not found
   */
  async delete(id: string): Promise<void> {
    this.validateObjectId(id);

    const task = await this.taskModel.findByIdAndDelete(id).exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  /**
   * Update task status by ID
   * @throws NotFoundException if task not found
   */
  async updateStatus(id: string, status: TaskStatus): Promise<TaskDocument> {
    this.validateObjectId(id);

    const task = await this.taskModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async updateStatusInProject(
    taskId: string,
    projectId: string,
    status: TaskStatus,
  ): Promise<TaskDocument> {
    this.validateObjectId(taskId);
    this.validateObjectId(projectId);

    const task = await this.taskModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(taskId),
          $expr: { $eq: [{ $toString: '$projectId' }, projectId] },
        },
        { status },
        { new: true },
      )
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found in the selected project');
    }

    return task;
  }

  /**
   * Get task completion statistics for tasks created by a manager and assigned to an expert
   */
  async getTaskCompletionStats(dto: TaskCompletionStatsDto): Promise<{
    managerId: string;
    expertId: string;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    pendingByStatus: {
      todo: number;
      in_progress: number;
    };
    completedByStatus: {
      done: number;
    };
  }> {
    const { projectId, managerId, expertId } = dto;

    this.validateObjectId(managerId);
    this.validateObjectId(expertId);

    const managerObjectId = new Types.ObjectId(managerId);
    const expertObjectId = new Types.ObjectId(expertId);

    const managerExpertQuery: Record<string, unknown> = {
      createdBy: managerObjectId,
      assignedTo: expertObjectId,
    };

    if (projectId) {
      managerExpertQuery.projectId = projectId;
    }

    // Total tasks
    const totalTasks = await this.taskModel.countDocuments(managerExpertQuery).exec();

    // Completed tasks (status = done)
    const completedQuery = { ...managerExpertQuery, status: TaskStatus.DONE };
    const completedTasks = await this.taskModel.countDocuments(completedQuery).exec();

    // Pending tasks by status
    const pendingTodo = await this.taskModel.countDocuments({
      ...managerExpertQuery,
      status: TaskStatus.TODO,
    }).exec();

    const pendingInProgress = await this.taskModel.countDocuments({
      ...managerExpertQuery,
      status: TaskStatus.IN_PROGRESS,
    }).exec();

    const pendingTasks = pendingTodo + pendingInProgress;
    
    return {
      managerId,
      expertId,
      totalTasks,
      completedTasks,
      pendingTasks,
      pendingByStatus: {
        todo: pendingTodo,
        in_progress: pendingInProgress,
      },
      completedByStatus: {
        done: completedTasks,
      },
    };
  }

  /**
   * Find tasks by project and user within a date range and return count statistics
   * A task overlaps with the date range if: task.startDate <= range.end AND task.dueDate >= range.start
   */
  async findTasksByProjectAndCount(dateCountDto: DateCountDto): Promise<{
    projectId: string;
    userId: string;
    startDate: string;
    endDate: string;
    todoTasks: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  }> {
    this.validateObjectId(dateCountDto.projectId);
    this.validateObjectId(dateCountDto.userId);

    const userObjectId = new Types.ObjectId(dateCountDto.userId);

    // Find tasks that overlap with the date range
    const tasks = await this.taskModel.find({
      projectId: dateCountDto.projectId,
      assignedTo: { $in: [userObjectId] },
      dueDate: { $gt: dateCountDto.enddate },
    } as any).exec();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === TaskStatus.DONE).length;
    const todoTasks = tasks.filter((task) => task.status === TaskStatus.TODO).length;
    const pendingTasks = totalTasks - completedTasks;

    // Adjust user score based on task performance
    // await this.adjustUserScore(dateCountDto.userId, tasks);

    return {
      projectId: dateCountDto.projectId,
      userId: dateCountDto.userId,
      startDate: dateCountDto.startdate,
      endDate: dateCountDto.enddate,
      todoTasks,
      totalTasks,
      completedTasks,
      pendingTasks,
    };
  }

  /**
   * Adjusts the user's score according to task completion timing.
   * +10 if all tasks are completed on or before the current date.
   * -10 if any task is overdue (dueDate passed and not DONE) or not all tasks are completed by due date.
   */
  // private async adjustUserScore(userId: string, tasks: TaskDocument[]): Promise<void> {
  //   if (!tasks.length) return;
  //   const now = new Date();
  //   const allCompletedOnTime = tasks.every(
  //     (t) => t.status === TaskStatus.DONE && new Date(t.dueDate) >= now,
  //   );
  //   const anyOverdue = tasks.some(
  //     (t) => t.status !== TaskStatus.DONE && new Date(t.dueDate) < now,
  //   );
  //   if (allCompletedOnTime) {
  //     await this.userService.increaseScore({ userId, score: 10 });
  //   } else if (anyOverdue) {
  //     await this.userService.increaseScore({ userId, score: -10 });
  //   }
  // }

 async findTaskByProjectId(projectId: string): Promise<TaskDocument[]> {
    return this.taskModel.find({ projectId }).exec();
  }

  async countOpenTasks(): Promise<number> {
    return this.taskModel
      .countDocuments({
        status: { $in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
      })
      .exec();
  }

  async countByProjectIdsAndStatus(projectIds: string[], status: TaskStatus): Promise<number> {
    if (projectIds.length === 0) {
      return 0;
    }

    projectIds.forEach((projectId) => this.validateObjectId(projectId));

    return this.taskModel
      .countDocuments({
        $expr: { $in: [{ $toString: '$projectId' }, projectIds] },
        status,
      })
      .exec();
  }

  countInProgressByProjectIds(projectIds: string[]): Promise<number> {
    return this.countByProjectIdsAndStatus(projectIds, TaskStatus.IN_PROGRESS);
  }

  countDoneByProjectIds(projectIds: string[]): Promise<number> {
    return this.countByProjectIdsAndStatus(projectIds, TaskStatus.DONE);
  }

  async countByAssigneeAndStatus(userId: string, status: TaskStatus): Promise<number> {
    this.validateObjectId(userId);

    return this.taskModel
      .countDocuments({
        assignedTo: new Types.ObjectId(userId),
        status,
      })
      .exec();
  }

  countDoneByAssignee(userId: string): Promise<number> {
    return this.countByAssigneeAndStatus(userId, TaskStatus.DONE);
  }

  async getStatusCountsByProjectIds(projectIds: string[]): Promise<
    Array<{
      projectId: string;
      totalTasks: number;
      inProgressTasks: number;
      doneTasks: number;
    }>
  > {
    if (projectIds.length === 0) {
      return [];
    }

    projectIds.forEach((projectId) => this.validateObjectId(projectId));

    return this.taskModel
      .aggregate([
        {
          $match: {
            $expr: { $in: [{ $toString: '$projectId' }, projectIds] },
          },
        },
        {
          $group: {
            _id: '$projectId',
            totalTasks: { $sum: 1 },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0] },
            },
            doneTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            projectId: { $toString: '$_id' },
            totalTasks: 1,
            inProgressTasks: 1,
            doneTasks: 1,
          },
        },
      ])
      .exec();
  }

  async getMemberStatusCounts(projectId: string, memberIds: string[]): Promise<
    Array<{
      userId: string;
      totalTasks: number;
      todoTasks: number;
      inProgressTasks: number;
      doneTasks: number;
    }>
  > {
    this.validateObjectId(projectId);
    memberIds.forEach((memberId) => this.validateObjectId(memberId));

    if (memberIds.length === 0) {
      return [];
    }

    const memberObjectIds = memberIds.map((memberId) => new Types.ObjectId(memberId));

    return this.taskModel
      .aggregate([
        {
          $match: {
            $expr: { $eq: [{ $toString: '$projectId' }, projectId] },
            assignedTo: { $in: memberObjectIds },
          },
        },
        { $unwind: '$assignedTo' },
        { $match: { assignedTo: { $in: memberObjectIds } } },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            todoTasks: { $sum: { $cond: [{ $eq: ['$status', TaskStatus.TODO] }, 1, 0] } },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0] },
            },
            doneTasks: { $sum: { $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0] } },
          },
        },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$_id' },
            totalTasks: 1,
            todoTasks: 1,
            inProgressTasks: 1,
            doneTasks: 1,
          },
        },
      ])
      .exec();
  }

  async findOverdueByProjectIds(projectIds: string[], page: number, limit: number) {
    if (projectIds.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    projectIds.forEach((projectId) => this.validateObjectId(projectId));
    const now = new Date();
    const match = {
      $expr: {
        $and: [
          { $in: [{ $toString: '$projectId' }, projectIds] },
          {
            $lt: [
              {
                $convert: {
                  input: '$dueDate',
                  to: 'date',
                  onError: null,
                  onNull: null,
                },
              },
              now,
            ],
          },
        ],
      },
      status: { $ne: TaskStatus.DONE },
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.taskModel
        .find(match)
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'firstName lastName email')
        .populate('projectId', 'title status')
        .exec(),
      this.taskModel.countDocuments(match).exec(),
    ]);

    return { data, total, page, limit };
  }

  async getProjectReport(projectId: string) {
    this.validateObjectId(projectId);
    const now = new Date();

    const [statusOverview, overdueTasks] = await Promise.all([
      this.getTaskStatusOverview(projectId),
      this.taskModel
        .countDocuments({
          $expr: {
            $and: [
              { $eq: [{ $toString: '$projectId' }, projectId] },
              {
                $lt: [
                  {
                    $convert: {
                      input: '$dueDate',
                      to: 'date',
                      onError: null,
                      onNull: null,
                    },
                  },
                  now,
                ],
              },
            ],
          },
          status: { $ne: TaskStatus.DONE },
        })
        .exec(),
    ]);

    return {
      ...statusOverview,
      overdueTasks,
      completionRate:
        statusOverview.totalTasks > 0
          ? Math.round((statusOverview.doneTasks / statusOverview.totalTasks) * 100)
          : 0,
    };
  }

  async getMemberStatusCountsAcrossProjects(projectIds: string[], memberIds: string[]): Promise<
    Array<{
      userId: string;
      projectIds: string[];
      totalTasks: number;
      todoTasks: number;
      inProgressTasks: number;
      doneTasks: number;
      overdueTasks: number;
    }>
  > {
    if (projectIds.length === 0 || memberIds.length === 0) {
      return [];
    }

    projectIds.forEach((projectId) => this.validateObjectId(projectId));
    memberIds.forEach((memberId) => this.validateObjectId(memberId));
    const memberObjectIds = memberIds.map((memberId) => new Types.ObjectId(memberId));
    const now = new Date();

    return this.taskModel
      .aggregate([
        {
          $match: {
            $expr: { $in: [{ $toString: '$projectId' }, projectIds] },
            assignedTo: { $in: memberObjectIds },
          },
        },
        { $unwind: '$assignedTo' },
        { $match: { assignedTo: { $in: memberObjectIds } } },
        {
          $group: {
            _id: '$assignedTo',
            projectIds: { $addToSet: '$projectId' },
            totalTasks: { $sum: 1 },
            todoTasks: { $sum: { $cond: [{ $eq: ['$status', TaskStatus.TODO] }, 1, 0] } },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0] },
            },
            doneTasks: { $sum: { $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0] } },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$status', TaskStatus.DONE] },
                      {
                        $lt: [
                          {
                            $convert: {
                              input: '$dueDate',
                              to: 'date',
                              onError: null,
                              onNull: null,
                            },
                          },
                          now,
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$_id' },
            projectIds: {
              $map: {
                input: '$projectIds',
                as: 'projectId',
                in: { $toString: '$$projectId' },
              },
            },
            totalTasks: 1,
            todoTasks: 1,
            inProgressTasks: 1,
            doneTasks: 1,
            overdueTasks: 1,
          },
        },
      ])
      .exec();
  }

  async getTaskStatusOverview(projectId?: string): Promise<{
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    doneTasks: number;
  }> {
    const match: Record<string, unknown> = {};

    if (projectId) {
      this.validateObjectId(projectId);
      match.$expr = { $eq: [{ $toString: '$projectId' }, projectId] };
    }

    const statusCounts = await this.taskModel
      .aggregate<{ _id: TaskStatus; count: number }>([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();

    const counts = statusCounts.reduce(
      (result, item) => ({
        ...result,
        [item._id]: item.count,
      }),
      {
        [TaskStatus.TODO]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.DONE]: 0,
      },
    );

    return {
      totalTasks: counts[TaskStatus.TODO] + counts[TaskStatus.IN_PROGRESS] + counts[TaskStatus.DONE],
      todoTasks: counts[TaskStatus.TODO],
      inProgressTasks: counts[TaskStatus.IN_PROGRESS],
      doneTasks: counts[TaskStatus.DONE],
    };
  }

  async getTaskCountsByAssignee(projectId?: string): Promise<
    Array<{
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      totalTasks: number;
      todoTasks: number;
      inProgressTasks: number;
      doneTasks: number;
    }>
  > {
    const match: Record<string, unknown> = {};

    if (projectId) {
      this.validateObjectId(projectId);
      match.projectId = new Types.ObjectId(projectId);
    }

    return this.taskModel
      .aggregate([
        { $match: match },
        { $unwind: '$assignedTo' },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            todoTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.TODO] }, 1, 0] },
            },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0] },
            },
            doneTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$_id' },
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            totalTasks: 1,
            todoTasks: 1,
            inProgressTasks: 1,
            doneTasks: 1,
          },
        },
        { $sort: { totalTasks: -1, doneTasks: -1 } },
      ])
      .exec();
  }

  async getMonthlyUserPerformance(query: {
    month: number;
    year: number;
    projectId?: string;
  }): Promise<{
    month: number;
    year: number;
    projectId?: string;
    users: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      score: number;
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      pendingTasks: number;
      completionRate: number;
    }>;
  }> {
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 1);
    const match: Record<string, unknown> = {
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    };

    if (query.projectId) {
      this.validateObjectId(query.projectId);
      match.projectId = new Types.ObjectId(query.projectId);
    }

    const users = await this.taskModel
      .aggregate([
        { $match: match },
        { $unwind: '$assignedTo' },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0] },
            },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0] },
            },
            pendingTasks: {
              $sum: { $cond: [{ $eq: ['$status', TaskStatus.TODO] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: { $toString: '$_id' },
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            score: { $ifNull: ['$user.score', 0] },
            totalTasks: 1,
            completedTasks: 1,
            inProgressTasks: 1,
            pendingTasks: 1,
            completionRate: {
              $cond: [
                { $gt: ['$totalTasks', 0] },
                { $round: [{ $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }, 0] },
                0,
              ],
            },
          },
        },
        { $sort: { completionRate: -1, score: -1, completedTasks: -1 } },
      ])
      .exec();

    return {
      month: query.month,
      year: query.year,
      projectId: query.projectId,
      users,
    };
  }


}
