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
import { User, UserDocument, UserRole } from '../../user/schemas/user.schema';
import {
  SupervisorMemberProfile,
  SupervisorMemberWorkCounts,
} from '../services/supervisor-member.types';

@Injectable()
export class SupervisorMemberRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findMembers(
    supervisorId: Types.ObjectId,
    recurrence: TaskRecurrence | undefined,
    page: number,
    limit: number,
  ): Promise<{
    members: SupervisorMemberProfile[];
    total: number;
  }> {
    const memberIds = await this.findMemberIds(supervisorId, recurrence);
    const filter = {
      _id: { $in: memberIds, $ne: supervisorId },
      roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
    };
    const [members, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          'firstName lastName email mobile roles isActive score progressPercentage performanceStatus performanceEvaluatedAt',
        )
        .sort({ firstName: 1, lastName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      members: members as unknown as SupervisorMemberProfile[],
      total,
    };
  }

  async countMemberTasks(
    supervisorId: Types.ObjectId,
    memberIds: Types.ObjectId[],
    recurrence?: TaskRecurrence,
  ): Promise<SupervisorMemberWorkCounts[]> {
    if (memberIds.length === 0) return [];

    return this.taskModel
      .aggregate<SupervisorMemberWorkCounts>([
        {
          $match: {
            createdBy: supervisorId,
            assignedTo: { $in: memberIds },
            ...(recurrence ? { recurrence } : {}),
          },
        },
        { $unwind: '$assignedTo' },
        { $match: { assignedTo: { $in: memberIds } } },
        {
          $group: {
            _id: '$assignedTo',
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', TaskStatus.DONE] }, 1, 0],
              },
            },
          },
        },
        { $project: { _id: 0, userId: '$_id', total: 1, completed: 1 } },
      ])
      .exec();
  }

  async countMemberFixedTasks(
    supervisorId: Types.ObjectId,
    memberIds: Types.ObjectId[],
    recurrence?: TaskRecurrence,
  ): Promise<SupervisorMemberWorkCounts[]> {
    if (memberIds.length === 0) return [];

    return this.fixedTaskModel
      .aggregate<SupervisorMemberWorkCounts>([
        {
          $match: {
            createdBy: supervisorId,
            assignedTo: { $in: memberIds },
            ...(recurrence ? { recurrence } : {}),
          },
        },
        {
          $group: {
            _id: '$assignedTo',
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', FixedTaskStatus.DONE] }, 1, 0],
              },
            },
          },
        },
        { $project: { _id: 0, userId: '$_id', total: 1, completed: 1 } },
      ])
      .exec();
  }

  private async findMemberIds(
    supervisorId: Types.ObjectId,
    recurrence?: TaskRecurrence,
  ): Promise<Types.ObjectId[]> {
    const taskFilter = {
      createdBy: supervisorId,
      ...(recurrence ? { recurrence } : {}),
    };
    const fixedTaskFilter = {
      createdBy: supervisorId,
      ...(recurrence
        ? { recurrence: recurrence as unknown as FixedTaskRecurrence }
        : {}),
    };
    const [taskMemberIds, fixedTaskMemberIds] = await Promise.all([
      this.taskModel.distinct('assignedTo', taskFilter).exec(),
      this.fixedTaskModel.distinct('assignedTo', fixedTaskFilter).exec(),
    ]);
    const uniqueIds = new Map<string, Types.ObjectId>();

    [...taskMemberIds, ...fixedTaskMemberIds].forEach((memberId) => {
      const objectId = new Types.ObjectId(memberId);
      uniqueIds.set(objectId.toString(), objectId);
    });

    uniqueIds.delete(supervisorId.toString());
    return [...uniqueIds.values()];
  }
}
