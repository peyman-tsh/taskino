import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCompletionStatsDto } from './dto/task-count.dto';
import { Task, TaskDocument, TaskStatus, TaskSchema } from './task.schema';
import { ExcelService } from 'src/excel/excel.service';
import { ExcelFile, ExcelDocument, ExcelType } from 'src/excel/excel.schema';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    private readonly excelService: ExcelService,
  ) {}

  /**
   * Create a new task
   */
  async create(createTaskDto: CreateTaskDto, file?: Express.Multer.File): Promise<TaskDocument | {
    task: TaskDocument;
    excelUpload: ExcelFile;
  }> {
    let excelUpload: ExcelFile;

    const { createdBy, assignedTo, ...rest } = createTaskDto;
    

    // Validate createdBy is a valid ObjectId
    if (!Types.ObjectId.isValid(createdBy)) {
      throw new BadRequestException('Invalid createdBy user ID');
    }

    // Normalize assignedTo to always be an array of strings
    const assignedToArray: string[] = Array.isArray(assignedTo) 
      ? assignedTo 
      : assignedTo 
        ? [assignedTo] 
        : [];

    // Validate assignedTo IDs if provided
    if (assignedToArray.length > 0) {
      const invalidIds = assignedToArray.filter((userId: string) => !Types.ObjectId.isValid(userId));
      console.log(invalidIds);
      
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid assignedTo user IDs');
      }
    }

    const createdTask = new this.taskModel({
      ...rest,
      createdBy: new Types.ObjectId(createdBy),
      assignedTo: assignedToArray.map((userId: string) => new Types.ObjectId(userId)),
    });

    if(file){
    const type='import' as ExcelType
    excelUpload = await this.excelService.uploadFile(file,createdBy,type);
    createdTask.file=excelUpload.fileName
     return{
      task: await createdTask.save(),

      excelUpload
     }
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

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a task by ID
   */
  async findById(id: string): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

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
   * Update a task by ID
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.taskModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateTaskDto.title !== undefined) {
      updateData.title = updateTaskDto.title;
    }

    if (updateTaskDto.status !== undefined) {
      updateData.status = updateTaskDto.status;
    }

    if (updateTaskDto.taskComment !== undefined) {
      updateData.taskComment = updateTaskDto.taskComment;
    }
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
   */
  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

    const task = await this.taskModel.findByIdAndDelete(id).exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  /**
   * Update task status by ID
   */
  async updateStatus(id: string, status: TaskStatus): Promise<TaskDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid task ID');
    }

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

  /**
   * Get task completion statistics for an expert assigned by a manager
   * Returns: total tasks, completed tasks, pending tasks (todo + in_progress)
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
    const { projectId,managerId, expertId } = dto;

    if (!Types.ObjectId.isValid(managerId)) {
      throw new BadRequestException('Invalid manager ID');
    }
    if (!Types.ObjectId.isValid(expertId)) {
      throw new BadRequestException('Invalid expert ID');
    }

    const managerObjectId = new Types.ObjectId(managerId);
    const expertObjectId = new Types.ObjectId(expertId);

    // Tasks created by manager AND assigned to expert
    const managerExpertQuery: Record<string, unknown> = {
      createdBy: managerObjectId,
      assignedTo: expertObjectId,
      projectId:projectId
    };

    // Total tasks
    const totalTasks = await this.taskModel.countDocuments(managerExpertQuery).exec();

    // Completed tasks (status = done)
    const completedQuery = { ...managerExpertQuery, status: TaskStatus.DONE };
    const completedTasks = await this.taskModel.countDocuments(completedQuery).exec();

    // Pending tasks (todo + in_progress)
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
}
