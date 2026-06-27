import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { formatTehranTime } from '../../common/utils/tehran-time.util';
import {
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';

@Injectable()
export class FixedTaskTimingService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
    private readonly queryService: FixedTaskQueryService,
  ) {}

  async startTimer(id: string, requesterId: string) {
    const taskId = this.policy.toObjectId(id, 'fixed task ID');
    const requesterObjectId = this.policy.toObjectId(
      requesterId,
      'requester user ID',
    );
    const task = await this.repository.findRawById(taskId);
    if (!task) throw new NotFoundException('Fixed task template not found');

    if (task.assignedTo.toString() !== requesterObjectId.toString()) {
      throw new ForbiddenException(
        'Only the fixed task assignee can start the timer',
      );
    }
    if (!task.isActive) {
      throw new BadRequestException('Only an active fixed task can be started');
    }
    if (task.status === FixedTaskStatus.DONE) {
      throw new BadRequestException('Completed fixed task cannot be started');
    }
    if (task.startedAt) {
      throw new BadRequestException('Fixed task timer has already started');
    }

    const startedAt = new Date();
    await this.repository.updateById(taskId, {
      status: FixedTaskStatus.IN_PROGRESS,
      startedAt,
      doneTime: null,
      actualDurationMinutes: null,
    });

    return this.queryService.findById(id);
  }

  async reviewTiming(
    id: string,
    managerId: string,
    status:
      | FixedTaskTimingApprovalStatus.APPROVED
      | FixedTaskTimingApprovalStatus.REJECTED,
    approvedDurationMinutes?: number,
    taskComment?: string,
  ) {
    const taskId = this.policy.toObjectId(id, 'fixed task ID');
    const managerObjectId = this.policy.toObjectId(
      managerId,
      'manager user ID',
    );
    const task = await this.repository.findRawById(taskId);
    if (!task) throw new NotFoundException('Fixed task template not found');
    if (task.status !== FixedTaskStatus.DONE) {
      throw new BadRequestException(
        'Fixed task timing can only be reviewed after completion',
      );
    }
    if (!task.actualDurationMinutes) {
      throw new BadRequestException(
        'Fixed task does not have a recorded actual duration',
      );
    }
    if (!task.startedAt || !task.doneTime) {
      throw new BadRequestException(
        'Fixed task does not have a complete recorded time range',
      );
    }

    const approved = status === FixedTaskTimingApprovalStatus.APPROVED;
    const duration = approved
      ? (approvedDurationMinutes ?? task.actualDurationMinutes)
      : null;

    const updateData: Record<string, unknown> = {
      timingApprovalStatus: status,
      approvedDurationMinutes: duration,
      startTime: approved ? formatTehranTime(task.startedAt) : null,
      endTime: approved ? formatTehranTime(task.doneTime) : null,
      timingApprovedBy: managerObjectId,
      timingApprovedAt: new Date(),
    };
    if (taskComment !== undefined) {
      updateData.taskComment = taskComment;
    }

    await this.repository.updateById(taskId, updateData);

    return this.queryService.findById(id);
  }
}
