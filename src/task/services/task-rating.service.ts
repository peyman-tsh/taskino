import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { RateTaskDto } from '../dto/rate-task.dto';
import { TaskDocument, TaskRatingStatus } from '../task.schema';
import { TaskRepository } from '../repositories/task.repository';
import { TaskPolicyService } from './task-policy.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../../common/events/user-progress.events';

@Injectable()
export class TaskRatingService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly policy: TaskPolicyService,
    private readonly eventBus: InternalEventBus,
  ) {}

  async rate(
    id: string,
    managerId: string,
    dto: RateTaskDto,
  ): Promise<TaskDocument> {
    this.policy.validateObjectId(id);
    this.policy.validateObjectId(managerId);

    const task = await this.repository.findRawById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const assigneeId = this.getAssigneeId(task);
    const updatedTask = await this.repository.updateById(id, {
      ratingScore: dto.score,
      ratingStatus: this.getRatingStatus(dto.score),
      ratingComment: dto.comment ?? null,
      ratedBy: new Types.ObjectId(managerId),
      ratedAt: new Date(),
    });
    if (!updatedTask) {
      throw new NotFoundException('Task not found');
    }

    await this.eventBus.publishAndWait(
      UserProgressEvents.REFRESH_REQUESTED,
      new UserProgressRefreshRequestedEvent([assigneeId]),
    );

    return updatedTask;
  }

  private getRatingStatus(score: number): TaskRatingStatus {
    if (score <= 1) return TaskRatingStatus.WEAK;
    if (score <= 3) return TaskRatingStatus.NORMAL;
    return TaskRatingStatus.GOOD;
  }

  private getAssigneeId(task: TaskDocument): string {
    const assignee = task.assignedTo[0] as unknown as {
      _id?: Types.ObjectId;
      toString(): string;
    };
    if (!assignee) {
      throw new BadRequestException('Task must have one assignee');
    }

    return assignee._id?.toString() ?? assignee.toString();
  }
}
