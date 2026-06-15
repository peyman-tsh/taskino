import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
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
import { SupervisorMemberWorkCounts } from '../services/supervisor-member.types';

@Injectable()
export class SupervisorMemberWorkRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
  ) {}

  async findMemberIds(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ): Promise<Types.ObjectId[]> {
    const [taskMemberIds, fixedTaskMemberIds] = await Promise.all([
      this.taskModel
        .distinct('assignedTo', this.taskCreatedByFilter(supervisorId, recurrence))
        .exec(),
      this.fixedTaskModel
        .distinct(
          'assignedTo',
          this.fixedTaskCreatedByFilter(supervisorId, recurrence),
        )
        .exec(),
    ]);
    const uniqueIds = new Map<string, Types.ObjectId>();

    [...taskMemberIds, ...fixedTaskMemberIds].forEach((memberId) => {
      const objectId = new Types.ObjectId(memberId);
      uniqueIds.set(objectId.toString(), objectId);
    });
    uniqueIds.delete(supervisorId.toString());
    return [...uniqueIds.values()];
  }

  countMemberTasks(
    supervisorId: Types.ObjectId,
    memberIds: Types.ObjectId[],
    recurrence?: TaskRecurrence,
  ): Promise<SupervisorMemberWorkCounts[]> {
    if (memberIds.length === 0) return Promise.resolve([]);

    return this.taskModel
      .aggregate<SupervisorMemberWorkCounts>(
        this.memberCountPipeline(
          supervisorId,
          memberIds,
          TaskStatus.DONE,
          recurrence,
          true,
        ),
      )
      .exec();
  }

  countMemberFixedTasks(
    supervisorId: Types.ObjectId,
    memberIds: Types.ObjectId[],
    recurrence?: TaskRecurrence,
  ): Promise<SupervisorMemberWorkCounts[]> {
    if (memberIds.length === 0) return Promise.resolve([]);

    return this.fixedTaskModel
      .aggregate<SupervisorMemberWorkCounts>(
        this.memberCountPipeline(
          supervisorId,
          memberIds,
          FixedTaskStatus.DONE,
          recurrence,
          false,
        ),
      )
      .exec();
  }

  private memberCountPipeline(
    supervisorId: Types.ObjectId,
    memberIds: Types.ObjectId[],
    doneStatus: TaskStatus.DONE | FixedTaskStatus.DONE,
    recurrence: TaskRecurrence | undefined,
    unwindAssignedTo: boolean,
  ): any[] {
    const pipeline: any[] = [
      {
        $match: {
          createdBy: supervisorId,
          assignedTo: { $in: memberIds },
          ...(recurrence ? { recurrence } : {}),
        },
      },
    ];
    if (unwindAssignedTo) {
      pipeline.push(
        { $unwind: '$assignedTo' },
        { $match: { assignedTo: { $in: memberIds } } },
      );
    }
    pipeline.push(
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', doneStatus] }, 1, 0] },
          },
        },
      },
      { $project: { _id: 0, userId: '$_id', total: 1, completed: 1 } },
    );
    return pipeline;
  }

  private taskCreatedByFilter(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ): Record<string, unknown> {
    return {
      createdBy: supervisorId,
      ...(recurrence ? { recurrence } : {}),
    };
  }

  private fixedTaskCreatedByFilter(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ): Record<string, unknown> {
    return {
      createdBy: supervisorId,
      ...(recurrence
        ? { recurrence: recurrence as unknown as FixedTaskRecurrence }
        : {}),
    };
  }
}
