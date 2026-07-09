import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  FixedTaskRatingStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { RateFixedTaskDto } from '../dto/rate-fixed-task.dto';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../../common/events/user-progress.events';

@Injectable()
export class FixedTaskRatingService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
    private readonly notificationService: FixedTaskNotificationService,
    private readonly eventBus: InternalEventBus,
  ) {}

  async rate(id: string, managerId: string, dto: RateFixedTaskDto) {
    const fixedTaskId = this.policy.toObjectId(id, 'fixed task ID');
    const managerObjectId = this.policy.toObjectId(managerId, 'manager user ID');
    const fixedTask = await this.repository.findRawById(fixedTaskId);

    if (!fixedTask) {
      throw new NotFoundException('Fixed task template not found');
    }

    const ratingStatus = this.getRatingStatus(dto.score);
    const ratingComment = dto.ratingComment ?? dto.comment ?? null;
    const ratedTask = await this.repository.updateById(fixedTaskId, {
      ratingScore: dto.score,
      ratingStatus,
      ratingComment,
      ratedBy: managerObjectId,
      ratedAt: new Date(),
    });

    if (!ratedTask) {
      throw new NotFoundException('Fixed task template not found');
    }

    const assigneeId = this.getAssigneeId(fixedTask);
    this.notificationService.notifyRated(
      assigneeId,
      fixedTask._id.toString(),
      fixedTask.title,
      dto.score,
    );

    await this.eventBus.publishAndWait(
      UserProgressEvents.REFRESH_REQUESTED,
      new UserProgressRefreshRequestedEvent([assigneeId]),
    );

    return ratedTask;
  }

  private getRatingStatus(score: number): FixedTaskRatingStatus {
    if (score <= 3) return FixedTaskRatingStatus.WEAK;
    if (score <= 6) return FixedTaskRatingStatus.NORMAL;
    return FixedTaskRatingStatus.GOOD;
  }

  private getAssigneeId(fixedTask: FixedTaskTemplateDocument): string {
    const assignee = fixedTask.assignedTo as unknown as {
      _id?: Types.ObjectId;
      toString(): string;
    };

    return assignee._id?.toString() ?? assignee.toString();
  }
}
