import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
} from '../../fixedTask/fixed-task.schema';
import { Task, TaskDocument, TaskRecurrence } from '../../task/task.schema';

@Injectable()
export class ManagerTasksRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
  ) {}

  async findAll(recurrence?: TaskRecurrence) {
    const taskFilter = recurrence ? { recurrence } : {};
    const fixedTaskFilter = recurrence
      ? { recurrence: recurrence as unknown as FixedTaskRecurrence }
      : {};
    const [tasks, fixedTasks] = await Promise.all([
      this.taskModel
        .find(taskFilter)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName email roles')
        .populate('assignedTo', 'firstName lastName email roles')
        .exec(),
      this.fixedTaskModel
        .find(fixedTaskFilter)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName email roles')
        .populate('assignedTo', 'firstName lastName email roles')
        .exec(),
    ]);

    return { tasks, fixedTasks };
  }
}
