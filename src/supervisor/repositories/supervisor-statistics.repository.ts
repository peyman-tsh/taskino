import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskStatus,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
} from '../../fixedTask/fixed-task.schema';
import {
  Task,
  TaskDocument,
  TaskRecurrence,
  TaskStatus,
} from '../../task/task.schema';

@Injectable()
export class SupervisorStatisticsRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
  ) {}

  countSupervisedTasks(supervisorId: Types.ObjectId, recurrence?: TaskRecurrence) {
    return this.taskModel
      .countDocuments(this.withRecurrence({ createdBy: supervisorId }, recurrence))
      .exec();
  }

  countSupervisedFixedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.fixedTaskModel
      .countDocuments(this.withRecurrence({ createdBy: supervisorId }, recurrence))
      .exec();
  }

  countSupervisedInProgressTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.taskModel
      .countDocuments(
        this.withRecurrence(
          { createdBy: supervisorId, status: TaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countSupervisedInProgressFixedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.fixedTaskModel
      .countDocuments(
        this.withRecurrence(
          { createdBy: supervisorId, status: FixedTaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countMyInProgressTasks(supervisorId: Types.ObjectId, recurrence?: TaskRecurrence) {
    return this.taskModel
      .countDocuments(
        this.withRecurrence(
          { assignedTo: supervisorId, status: TaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countMyInProgressFixedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.fixedTaskModel
      .countDocuments(
        this.withRecurrence(
          { assignedTo: supervisorId, status: FixedTaskStatus.IN_PROGRESS },
          recurrence,
        ),
      )
      .exec();
  }

  countMySuccessfulTasks(supervisorId: Types.ObjectId, recurrence?: TaskRecurrence) {
    return this.taskModel
      .countDocuments(
        this.withRecurrence(
          { assignedTo: supervisorId, status: TaskStatus.DONE },
          recurrence,
        ),
      )
      .exec();
  }

  countMyOnTimeSuccessfulTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.taskModel
      .countDocuments(
        this.withRecurrence(
          {
            assignedTo: supervisorId,
            status: TaskStatus.DONE,
            doneTime: { $type: 'date' },
            dueDate: { $type: 'date' },
            $expr: { $lt: ['$doneTime', '$dueDate'] },
          },
          recurrence,
        ),
      )
      .exec();
  }

  countActiveCompletedSupervisedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.taskModel
      .countDocuments(
        this.withRecurrence(
          {
            createdBy: supervisorId,
            assignedTo: { $ne: supervisorId },
            status: TaskStatus.DONE,
            dueDate: { $type: 'date', $gte: new Date() },
          },
          recurrence,
        ),
      )
      .exec();
  }

  countActiveCompletedSupervisedFixedTasks(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ) {
    return this.fixedTaskModel
      .countDocuments(
        this.withRecurrence(
          {
            createdBy: supervisorId,
            assignedTo: { $ne: supervisorId },
            status: FixedTaskStatus.DONE,
            endDate: { $type: 'date', $gte: new Date() },
          },
          recurrence,
        ),
      )
      .exec();
  }

  private withRecurrence(
    filter: Record<string, unknown>,
    recurrence?: TaskRecurrence,
  ): Record<string, unknown> {
    return recurrence ? { ...filter, recurrence } : filter;
  }
}
