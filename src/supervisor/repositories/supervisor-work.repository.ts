import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
} from '../../fixedTask/fixed-task.schema';
import { Task, TaskDocument } from '../../task/task.schema';
import {
  SupervisorFixedTasksQueryDto,
  SupervisorTasksQueryDto,
} from '../dto/supervisor-query.dto';

@Injectable()
export class SupervisorWorkRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
  ) {}

  async findSupervisedTasks(
    supervisorId: Types.ObjectId,
    query: SupervisorTasksQueryDto,
  ) {
    const filter: Record<string, unknown> = {
      createdBy: supervisorId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.recurrence ? { recurrence: query.recurrence } : {}),
    };
    const [data, total] = await Promise.all([
      this.taskModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(this.getSkip(query.page, query.limit))
        .limit(query.limit)
        .populate('assignedTo', 'firstName lastName email roles workField')
        .populate('excelFile', 'fileName originalName status type')
        .exec(),
      this.taskModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  async findSupervisedFixedTasks(
    supervisorId: Types.ObjectId,
    query: SupervisorFixedTasksQueryDto,
  ) {
    const filter: Record<string, unknown> = {
      createdBy: supervisorId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.recurrence
        ? {
            recurrence: query.recurrence as unknown as FixedTaskRecurrence,
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.fixedTaskModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(this.getSkip(query.page, query.limit))
        .limit(query.limit)
        .populate('assignedTo', 'firstName lastName email roles workField')
        .exec(),
      this.fixedTaskModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  private getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }
}
