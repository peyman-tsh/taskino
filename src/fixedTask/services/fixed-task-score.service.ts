import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import {
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';

@Injectable()
export class FixedTaskScoreService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly userService: UserService,
    private readonly deadlineService: FixedTaskDeadlineService,
  ) {}

  async adjustTaskScore(task: FixedTaskTemplateDocument): Promise<void> {
    const score = this.calculateScore(task);
    if (score === null) {
      return;
    }

    const claimedTask = await this.repository.claimScoreAdjustment(task._id);
    if (!claimedTask) {
      return;
    }

    await this.userService.adjustSpecialistScore(
      task.assignedTo.toString(),
      score,
    );
  }

  async adjustOverdueTasks(): Promise<void> {
    const tasks = await this.repository.findUnadjustedIncomplete();
    for (const task of tasks) {
      await this.adjustTaskScore(task);
    }
  }

  private calculateScore(
    task: FixedTaskTemplateDocument,
  ): 10 | -10 | null {
    const deadline = this.deadlineService.getScoreDeadline(task);
    if (!deadline) {
      return null;
    }

    if (task.status === FixedTaskStatus.DONE) {
      if (this.exceededApprovedDuration(task)) {
        return -10;
      }

      return task.doneTime && task.doneTime.getTime() <= deadline.getTime()
        ? 10
        : -10;
    }

    return deadline.getTime() < Date.now() ? -10 : null;
  }

  private exceededApprovedDuration(task: FixedTaskTemplateDocument): boolean {
    return (
      task.approvedDurationMinutes !== null &&
      task.approvedDurationMinutes !== undefined &&
      task.actualDurationMinutes !== null &&
      task.actualDurationMinutes !== undefined &&
      task.actualDurationMinutes > task.approvedDurationMinutes
    );
  }

}
