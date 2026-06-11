import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskCompletionStatsDto } from '../dto/task-count.dto';
import { Task, TaskDocument, TaskRecurrence, TaskStatus } from '../task.schema';
import { ExcelService } from '../../excel/services/excel.service';
import { ExcelFile, ExcelType } from '../../excel/excel.schema';
import { DateCountDto } from '../dto/dateCount.dto';
import { TaskNotificationService } from './task-notification.service';
import { TaskPolicyService } from './task-policy.service';
import { TaskReportService } from './task-report.service';

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
    private readonly taskPolicy: TaskPolicyService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly taskReportService: TaskReportService,
  ) {}

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
    this.taskPolicy.validateObjectId(createdBy);

    // Normalize and validate assignedTo
    const assignedToArray = this.taskPolicy.normalizeAssignedTo(assignedTo);
    this.taskPolicy.assertSingleAssignee(assignedToArray);
    this.taskPolicy.assertValidAssigneeIds(assignedToArray);
    await this.taskPolicy.assertParticipants(createdBy, assignedToArray);

    const parsedStartDate = startDate
      ? this.taskPolicy.parseDateTime(startDate, 'startDate')
      : undefined;
    const parsedDueDate = dueDate
      ? this.taskPolicy.parseDateTime(dueDate, 'dueDate')
      : undefined;
    this.taskPolicy.assertValidDeadline(parsedStartDate, parsedDueDate);
    this.taskPolicy.assertValidTimeRange(startTime, endTime);

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
      this.taskNotificationService.notifyAssignedUsers(
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
    this.taskNotificationService.notifyAssignedUsers(
      assignedToArray,
      savedTask._id.toString(),
      savedTask.title,
    );
    return savedTask;
  }

  /**
   * Find all tasks with pagination and optional filters
   */

  async getUserTasksByName(
    userName: string,
    lastName: string,
  ): Promise<TaskDocument[]> {
    const user = await this.taskPolicy.findUserByName(userName, lastName);
    return this.taskModel.find({ assignedTo: user._id }).exec();
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
      ? this.taskPolicy.parseDateTime(filters.startDate, 'startDate')
      : undefined;
    const rangeEnd = filters?.endDate
      ? this.taskPolicy.parseDateTime(filters.endDate, 'endDate')
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
    this.taskPolicy.validateObjectId(id);

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
    this.taskPolicy.validateObjectId(id);

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
        ? this.taskPolicy.parseDateTime(updateTaskDto.startDate, 'startDate')
        : task.startDate;
    const nextDueDate =
      updateTaskDto.dueDate !== undefined
        ? this.taskPolicy.parseDateTime(updateTaskDto.dueDate, 'dueDate')
        : task.dueDate;
    this.taskPolicy.assertValidDeadline(nextStartDate, nextDueDate);
    this.taskPolicy.assertValidTimeRange(
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
      this.taskPolicy.assertSingleAssignee(updateTaskDto.assignedTo);
      this.taskPolicy.assertValidAssigneeIds(updateTaskDto.assignedTo);
      await this.taskPolicy.assertParticipants(
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

    this.taskNotificationService.notifyAssignedUsers(
      newlyAssignedUserIds,
      updatedTask._id.toString(),
      updatedTask.title,
    );
    if (changedToDone) {
      this.taskNotificationService.notifyCreatorWhenCompleted(
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
    this.taskPolicy.validateObjectId(id);

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
    this.taskPolicy.validateObjectId(id);

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
      this.taskNotificationService.notifyCreatorWhenCompleted(
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
    return this.taskReportService.getTaskCompletionStats(dto);
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
    return this.taskReportService.findTasksByUserAndCount(dateCountDto);
  }

}
