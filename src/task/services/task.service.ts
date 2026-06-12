import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskCompletionStatsDto } from '../dto/task-count.dto';
import { TaskDocument, TaskStatus } from '../task.schema';
import { ExcelService } from '../../excel/services/excel.service';
import { ExcelFile, ExcelType } from '../../excel/excel.schema';
import { DateCountDto } from '../dto/dateCount.dto';
import { TaskNotificationService } from './task-notification.service';
import { TaskPolicyService } from './task-policy.service';
import { TaskReportService } from './task-report.service';
import { TaskRepository } from '../repositories/task.repository';
import { TaskScoreService } from './task-score.service';
import { TaskListFilters, TaskQueryService } from './task-query.service';
import { TaskUpdateService } from './task-update.service';

// Constants
const EXCEL_IMPORT_TYPE = 'import' as ExcelType;

/**
 * Task Service
 * Handles CRUD operations for tasks with pagination and filtering.
 */
@Injectable()
export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly excelService: ExcelService,
    private readonly taskPolicy: TaskPolicyService,
    private readonly taskNotificationService: TaskNotificationService,
    private readonly taskReportService: TaskReportService,
    private readonly taskScoreService: TaskScoreService,
    private readonly taskQueryService: TaskQueryService,
    private readonly taskUpdateService: TaskUpdateService,
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

    const taskData: Record<string, unknown> = {
      _id: new Types.ObjectId(),
      ...rest,
      createdBy: new Types.ObjectId(createdBy),
      assignedTo: assignedToArray.map((userId) => new Types.ObjectId(userId)),
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      startTime,
      endTime,
      doneTime: rest.status === TaskStatus.DONE ? new Date() : undefined,
    };

    // Handle file upload if provided
    if (file) {
      const excelUpload = await this.excelService.uploadFile(
        file,
        createdBy,
        EXCEL_IMPORT_TYPE,
      );
      taskData.file = excelUpload.fileName;
      taskData.excelFile = new Types.ObjectId(excelUpload._id.toString());
      const savedTask = await this.repository.create(taskData);
      if (savedTask.status === TaskStatus.DONE) {
        await this.taskScoreService.adjustCompletedTaskScore(savedTask);
      }
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

    const savedTask = await this.repository.create(taskData);
    if (savedTask.status === TaskStatus.DONE) {
      await this.taskScoreService.adjustCompletedTaskScore(savedTask);
    }
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
    return this.repository.find({ assignedTo: user._id });
  }
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: TaskListFilters,
  ): Promise<{
    data: TaskDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.taskQueryService.findAll(page, limit, filters);
  }

  /**
   * Find a task by ID with populated user fields
   * @throws NotFoundException if task not found
   */
  async findById(id: string): Promise<TaskDocument> {
    this.taskPolicy.validateObjectId(id);

    const task = await this.repository.findById(id);

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
    return this.taskUpdateService.update(id, updateTaskDto);
  }

  /**
   * Delete a task by ID
   * @throws NotFoundException if task not found
   */
  async delete(id: string): Promise<void> {
    this.taskPolicy.validateObjectId(id);

    const task = await this.repository.findRawById(id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.excelFile) {
      await this.excelService.delete(task.excelFile.toString());
    }

    await this.repository.deleteById(id);
  }

  /**
   * Update task status by ID
   * @throws NotFoundException if task not found
   */
  async updateStatus(id: string, status: TaskStatus): Promise<TaskDocument> {
    this.taskPolicy.validateObjectId(id);

    const existingTask = await this.repository.findRawById(id);
    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const task = await this.repository.updateById(id, {
      status,
      doneTime:
        status === TaskStatus.DONE ? (existingTask.doneTime ?? new Date()) : null,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (status === TaskStatus.DONE && existingTask.status !== TaskStatus.DONE) {
      await this.taskScoreService.adjustCompletedTaskScore(task);
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
