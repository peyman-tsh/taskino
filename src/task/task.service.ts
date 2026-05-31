import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskDocument, TaskStatus, TaskSchema } from './task.schema';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  /**
   * Create a new task
   */
  async create(createTaskDto: CreateTaskDto): Promise<TaskDocument> {
    const { createdBy, assignedTo, ...rest } = createTaskDto;

    // Validate createdBy is a valid ObjectId
    if (!Types.ObjectId.isValid(createdBy)) {
      throw new BadRequestException('Invalid createdBy user ID');
    }

    // Validate assignedTo IDs if provided
    if (assignedTo && assignedTo.length > 0) {
      const invalidIds = assignedTo.filter((id) => !Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid assignedTo user IDs');
      }
    }

    const createdTask = new this.taskModel({
      ...rest,
      createdBy: new Types.ObjectId(createdBy),
      assignedTo: assignedTo?.map((id) => new Types.ObjectId(id)) || [],
    });

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
}