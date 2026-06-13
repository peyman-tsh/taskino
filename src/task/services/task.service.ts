import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskCompletionStatsDto } from '../dto/task-count.dto';
import { TaskDocument, TaskStatus } from '../task.schema';
import { ExcelService } from '../../excel/services/excel.service';
import { DateCountDto } from '../dto/dateCount.dto';
import { TaskPolicyService } from './task-policy.service';
import { TaskReportService } from './task-report.service';
import { TaskRepository } from '../repositories/task.repository';
import { TaskListFilters, TaskQueryService } from './task-query.service';
import { TaskUpdateService } from './task-update.service';
import {
  TaskCreationResult,
  TaskCreationService,
} from './task-creation.service';

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
    private readonly taskReportService: TaskReportService,
    private readonly taskQueryService: TaskQueryService,
    private readonly taskUpdateService: TaskUpdateService,
    private readonly taskCreationService: TaskCreationService,
  ) {}

  /**
   * Create a new task
   */
  async create(
    createTaskDto: CreateTaskDto,
    file?: Express.Multer.File,
  ): Promise<TaskCreationResult> {
    return this.taskCreationService.create(createTaskDto, file);
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
    return this.taskUpdateService.update(id, { status });
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
