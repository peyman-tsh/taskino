import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCompletionStatsDto } from './dto/task-count.dto';
import { Task, TaskDocument, TaskRecurrence, TaskStatus } from './task.schema';
import { ExcelService } from '../excel/excel.service';
import { ExcelFile, ExcelType } from '../excel/excel.schema';
import { DateCountDto } from './dto/dateCount.dto';
import { UserService } from 'src/user/user.service';
import { InternalEventBus } from '../common/events/internal-event-bus.service';
import {
  NotificationEvents,
  TaskAssignedNotificationEvent,
  TaskCompletedNotificationEvent,
} from '../notification/events/notification.events';
import { UserRole } from '../user/schemas/user.schema';
import { isValidTimeRange } from '../common/constants/time.constants';

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
    private readonly eventBus: InternalEventBus,
  ) {}

  private notifyAssignedUsers(
    userIds: string[],
    taskId: string,
    taskTitle: string,
  ): void {
    if (userIds.length === 0) {
      return;
    }

    this.eventBus.publish(
      NotificationEvents.TASK_ASSIGNED,
      new TaskAssignedNotificationEvent(userIds, taskId, taskTitle),
    );
  }

  private notifyCreatorWhenCompleted(
    creatorId: string,
    taskId: string,
    taskTitle: string,
  ): void {
    this.eventBus.publish(
      NotificationEvents.TASK_COMPLETED,
      new TaskCompletedNotificationEvent(
        creatorId,
        taskId,
        taskTitle,
        'an assigned user',
      ),
    );
  }

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
  private normalizeAssignedTo(
    assignedTo: string | string[] | undefined,
  ): string[] {
    if (Array.isArray(assignedTo)) {
      return assignedTo;
    }
    return assignedTo ? [assignedTo] : [];
  }

  private assertSingleAssignee(assignedTo: string[]): void {
    if (assignedTo.length !== 1) {
      throw new BadRequestException(
        'A task must be assigned to exactly one user',
      );
    }
  }

  private parseTaskDateTime(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} is not a valid date-time`);
    }
    return date;
  }

  private assertValidDeadline(startDate?: Date, dueDate?: Date): void {
    if (startDate && dueDate && dueDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('dueDate must be after startDate');
    }
  }

  private assertValidTimeRange(startTime?: string, endTime?: string): void {
    if (!isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  private async assertStandaloneTaskParticipants(
    creatorId: string,
    assigneeIds: string[],
  ): Promise<void> {
    const participants = await this.userService.findTaskParticipantsByIds([
      creatorId,
      ...assigneeIds,
    ]);
    const creator = participants.find(
      (participant) => participant.userId === creatorId,
    );

    if (
      !creator ||
      ![UserRole.MANAGER, UserRole.SUPERVISOR].includes(
        creator.role as UserRole,
      )
    ) {
      throw new BadRequestException(
        'Task creator must have the manager or supervisor role',
      );
    }

    const invalidAssignee = participants.find(
      (participant) =>
        participant.userId !== creatorId &&
        ![UserRole.SPECIALIST, UserRole.SUPERVISOR].includes(
          participant.role as UserRole,
        ),
    );

    if (invalidAssignee) {
      throw new BadRequestException(
        'Task assignees must have the specialist or supervisor role',
      );
    }
  }

  /**
   * Create a new task
   */
  async create(
    createTaskDto: CreateTaskDto,
    file?: Express.Multer.File,
  ): Promise<
    | TaskDocument
    | {
        task: TaskDocument;
        excelUpload: ExcelFile;
      }
  > {
    const {
      createdBy,
      assignedTo,
      startDate,
      dueDate,
      startTime,
      endTime,
      ...rest
    } = createTaskDto;

    // Validate createdBy
    this.validateObjectId(createdBy);

    // Normalize and validate assignedTo
    const assignedToArray = this.normalizeAssignedTo(assignedTo);
    this.assertSingleAssignee(assignedToArray);
    if (assignedToArray.length > 0) {
      const invalidIds = assignedToArray.filter(
        (userId) => !Types.ObjectId.isValid(userId),
      );
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid assignedTo user IDs');
      }
    }

    await this.assertStandaloneTaskParticipants(createdBy, assignedToArray);

    const parsedStartDate = startDate
      ? this.parseTaskDateTime(startDate, 'startDate')
      : undefined;
    const parsedDueDate = dueDate
      ? this.parseTaskDateTime(dueDate, 'dueDate')
      : undefined;
    this.assertValidDeadline(parsedStartDate, parsedDueDate);
    this.assertValidTimeRange(startTime, endTime);

    const createdTask = new this.taskModel({
      _id: new Types.ObjectId(),
      ...rest,
      createdBy: new Types.ObjectId(createdBy),
      assignedTo: assignedToArray.map((userId) => new Types.ObjectId(userId)),
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      startTime,
      endTime,
      doneTime: rest.status === TaskStatus.DONE ? new Date() : undefined,
    });

    // Handle file upload if provided
    if (file) {
      const excelUpload = await this.excelService.uploadFile(
        file,
        createdBy,
        EXCEL_IMPORT_TYPE,
      );
      createdTask.file = excelUpload.fileName;
      createdTask.excelFile = new Types.ObjectId(excelUpload._id.toString());
      const savedTask = await createdTask.save();
      this.notifyAssignedUsers(
        assignedToArray,
        savedTask._id.toString(),
        savedTask.title,
      );
      return {
        task: savedTask,
        excelUpload,
      };
    }

    const savedTask = await createdTask.save();
    this.notifyAssignedUsers(
      assignedToArray,
      savedTask._id.toString(),
      savedTask.title,
    );
    return savedTask;
  }

  /**
   * Find all tasks with pagination and optional filters
   */

  async getUserTasksByName(userName:string,lastname:string): Promise<TaskDocument[]> {
   const getUserTasksByName=await this.userService.findByName(userName,lastname);
   const tasks = await this.taskModel.find({ assignedTo: getUserTasksByName._id }).exec();
   return tasks;
  }
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      createdBy?: string;
      assignedTo?: string;
      status?: TaskStatus;
      startDate?: string;
      endDate?: string;
      recurrence?: TaskRecurrence;
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
    if (filters?.recurrence) {
      if (!Object.values(TaskRecurrence).includes(filters.recurrence)) {
        throw new BadRequestException('Invalid task recurrence');
      }
      query.recurrence = filters.recurrence;
    }
    const rangeStart = filters?.startDate
      ? this.parseTaskDateTime(filters.startDate, 'startDate')
      : undefined;
    const rangeEnd = filters?.endDate
      ? this.parseTaskDateTime(filters.endDate, 'endDate')
      : undefined;
    if (rangeStart && rangeEnd && rangeEnd.getTime() < rangeStart.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    if (rangeStart) {
      query.dueDate = { $gte: rangeStart };
    }
    if (rangeEnd) {
      query.startDate = { $lte: rangeEnd };
    }

    const [data, total] = await Promise.all([
      this.taskModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('assignedTo', 'firstName lastName email')
        .populate(
          'excelFile',
          'fileName originalName mimeType fileSize type status',
        )
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
      .populate(
        'excelFile',
        'fileName originalName mimeType fileSize type status',
      )
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
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskDocument> {
    this.validateObjectId(id);

    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Build update object only with defined values
    const updateData: Record<string, unknown> = Object.fromEntries(
      Object.entries(updateTaskDto).filter(([_, value]) => value !== undefined),
    );
    const nextStartDate =
      updateTaskDto.startDate !== undefined
        ? this.parseTaskDateTime(updateTaskDto.startDate, 'startDate')
        : task.startDate;
    const nextDueDate =
      updateTaskDto.dueDate !== undefined
        ? this.parseTaskDateTime(updateTaskDto.dueDate, 'dueDate')
        : task.dueDate;
    this.assertValidDeadline(nextStartDate, nextDueDate);
    this.assertValidTimeRange(
      updateTaskDto.startTime ?? task.startTime,
      updateTaskDto.endTime ?? task.endTime,
    );
    if (updateTaskDto.startDate !== undefined) {
      updateData.startDate = nextStartDate;
    }
    if (updateTaskDto.dueDate !== undefined) {
      updateData.dueDate = nextDueDate;
    }

    // Validate and convert assignedTo if provided
    if (updateTaskDto.assignedTo !== undefined) {
      this.assertSingleAssignee(updateTaskDto.assignedTo);
      const invalidIds = updateTaskDto.assignedTo.filter(
        (userId) => !Types.ObjectId.isValid(userId),
      );
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid assignedTo user IDs');
      }
      await this.assertStandaloneTaskParticipants(
        task.createdBy.toString(),
        updateTaskDto.assignedTo,
      );
      updateData.assignedTo = updateTaskDto.assignedTo.map(
        (userId) => new Types.ObjectId(userId),
      );
    }

    const previousAssigneeIds = task.assignedTo.map((userId) =>
      userId.toString(),
    );
    const newlyAssignedUserIds =
      updateTaskDto.assignedTo?.filter(
        (userId) => !previousAssigneeIds.includes(userId),
      ) ?? [];
    const changedToDone =
      updateTaskDto.status === TaskStatus.DONE &&
      task.status !== TaskStatus.DONE;
    if (changedToDone) {
      updateData.doneTime = new Date();
    } else if (
      updateTaskDto.status !== undefined &&
      updateTaskDto.status !== TaskStatus.DONE
    ) {
      updateData.doneTime = null;
    }

    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate(
        'excelFile',
        'fileName originalName mimeType fileSize type status',
      )
      .exec();

    if (!updatedTask) {
      throw new NotFoundException('Task not found');
    }

    this.notifyAssignedUsers(
      newlyAssignedUserIds,
      updatedTask._id.toString(),
      updatedTask.title,
    );
    if (changedToDone) {
      this.notifyCreatorWhenCompleted(
        task.createdBy.toString(),
        updatedTask._id.toString(),
        updatedTask.title,
      );
    }

    return updatedTask;
  }

  /**
   * Delete a task by ID
   * @throws NotFoundException if task not found
   */
  async delete(id: string): Promise<void> {
    this.validateObjectId(id);

    const task = await this.taskModel.findById(id).exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.excelFile) {
      await this.excelService.delete(task.excelFile.toString());
    }

    await this.taskModel.findByIdAndDelete(id).exec();
  }

  /**
   * Update task status by ID
   * @throws NotFoundException if task not found
   */
  async updateStatus(id: string, status: TaskStatus): Promise<TaskDocument> {
    this.validateObjectId(id);

    const existingTask = await this.taskModel.findById(id).exec();
    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const task = await this.taskModel
      .findByIdAndUpdate(
        id,
        {
          status,
          doneTime:
            status === TaskStatus.DONE
              ? (existingTask.doneTime ?? new Date())
              : null,
        },
        { new: true },
      )
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate(
        'excelFile',
        'fileName originalName mimeType fileSize type status',
      )
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (status === TaskStatus.DONE && existingTask.status !== TaskStatus.DONE) {
      this.notifyCreatorWhenCompleted(
        existingTask.createdBy.toString(),
        task._id.toString(),
        task.title,
      );
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
    const { managerId, expertId } = dto;

    this.validateObjectId(managerId);
    this.validateObjectId(expertId);

    const managerObjectId = new Types.ObjectId(managerId);
    const expertObjectId = new Types.ObjectId(expertId);

    const managerExpertQuery: Record<string, unknown> = {
      createdBy: managerObjectId,
      assignedTo: expertObjectId,
    };

    // Total tasks
    const totalTasks = await this.taskModel
      .countDocuments(managerExpertQuery)
      .exec();

    // Completed tasks (status = done)
    const completedQuery = { ...managerExpertQuery, status: TaskStatus.DONE };
    const completedTasks = await this.taskModel
      .countDocuments(completedQuery)
      .exec();

    // Pending tasks by status
    const pendingTodo = await this.taskModel
      .countDocuments({
        ...managerExpertQuery,
        status: TaskStatus.TODO,
      })
      .exec();

    const pendingInProgress = await this.taskModel
      .countDocuments({
        ...managerExpertQuery,
        status: TaskStatus.IN_PROGRESS,
      })
      .exec();

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
   * Find tasks by user within a date range and return count statistics
   * A task overlaps with the date range if: task.startDate <= range.end AND task.dueDate >= range.start
   */
  async findTasksByUserAndCount(dateCountDto: DateCountDto): Promise<{
    userId: string;
    startDate: string;
    endDate: string;
    todoTasks: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  }> {
    this.validateObjectId(dateCountDto.userId);

    const userObjectId = new Types.ObjectId(dateCountDto.userId);

    // Find tasks that overlap with the date range
    const rangeStart = new Date(dateCountDto.startdate);
    const rangeEnd = new Date(dateCountDto.enddate);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const tasks = await this.taskModel
      .find({
        assignedTo: userObjectId,
        startDate: { $lte: rangeEnd },
        dueDate: { $gte: rangeStart },
      })
      .exec();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.DONE,
    ).length;
    const todoTasks = tasks.filter(
      (task) => task.status === TaskStatus.TODO,
    ).length;
    const pendingTasks = totalTasks - completedTasks;

    //Adjust user score based on task performance
    await this.adjustUserScore(dateCountDto.userId, tasks);

    return {
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
  private async adjustUserScore(
    userId: string,
    tasks: TaskDocument[],
  ): Promise<void> {
    if (!tasks.length) return;
    const now = new Date();
    const allCompletedOnTime = tasks.every(
      (task) =>
        task.status === TaskStatus.DONE &&
        task.dueDate !== undefined &&
        task.dueDate >= now,
    );
    const anyOverdue = tasks.some(
      (task) =>
        task.status !== TaskStatus.DONE &&
        task.dueDate !== undefined &&
        task.dueDate < now,
    );
    if (allCompletedOnTime) {
      const result = await this.taskModel
        .updateMany(
          {
            _id: { $in: tasks.map((task) => task._id) },
            scoreAdjusted: { $ne: true },
          },
          { $set: { scoreAdjusted: true } },
        )
        .exec();
      if (result.modifiedCount > 0) {
        await this.userService.increaseScore({ userId, score: 10 });
      }
    } else if (anyOverdue) {
      const overdueTaskIds = tasks
        .filter(
          (task) =>
            task.status !== TaskStatus.DONE &&
            task.dueDate !== undefined &&
            task.dueDate < now,
        )
        .map((task) => task._id);
      const result = await this.taskModel
        .updateMany(
          {
            _id: { $in: overdueTaskIds },
            scoreAdjusted: { $ne: true },
          },
          { $set: { scoreAdjusted: true } },
        )
        .exec();
      if (result.modifiedCount > 0) {
        await this.userService.increaseScore({ userId, score: -10 });
      }
    }
  }

  async countOpenTasks(): Promise<number> {
    return this.taskModel
      .countDocuments({
        status: { $in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
      })
      .exec();
  }

  async countByAssigneeAndStatus(
    userId: string,
    status: TaskStatus,
  ): Promise<number> {
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

  async getTaskStatusOverview(): Promise<{
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    doneTasks: number;
  }> {
    const match: Record<string, unknown> = {};

    const statusCounts = await this.taskModel
      .aggregate<{
        _id: TaskStatus;
        count: number;
      }>([
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
      totalTasks:
        counts[TaskStatus.TODO] +
        counts[TaskStatus.IN_PROGRESS] +
        counts[TaskStatus.DONE],
      todoTasks: counts[TaskStatus.TODO],
      inProgressTasks: counts[TaskStatus.IN_PROGRESS],
      doneTasks: counts[TaskStatus.DONE],
    };
  }

  async getTaskCountsByAssignee(): Promise<
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
              $sum: {
                $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0],
              },
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
  }): Promise<{
    month: number;
    year: number;
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
              $sum: {
                $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0],
              },
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
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ['$completedTasks', '$totalTasks'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
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
      users,
    };
  }
}
