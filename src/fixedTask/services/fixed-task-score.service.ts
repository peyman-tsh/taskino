import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';

@Injectable()
export class FixedTaskScoreService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly userService: UserService,
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
    const tasks = await this.repository.findUnadjustedWithDeadline(new Date());
    for (const task of tasks) {
      await this.adjustTaskScore(task);
    }
  }

  private calculateScore(
    task: FixedTaskTemplateDocument,
  ): 10 | -10 | null {
    const deadline = task.nextRunAt ?? this.getNextDeadline(task.recurrence);

    if (task.status === FixedTaskStatus.DONE) {
      return task.doneTime && task.doneTime.getTime() <= deadline.getTime()
        ? 10
        : -10;
    }

    return deadline.getTime() < Date.now() ? -10 : null;
  }

  getNextDeadline(
    recurrence: FixedTaskRecurrence,
    now = new Date(),
  ): Date {
    if (recurrence === FixedTaskRecurrence.DAILY) {
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      return end;
    }

    if (recurrence === FixedTaskRecurrence.WEEKLY) {
      const end = new Date(now);
      const daysUntilSaturday = (6 - end.getDay() + 7) % 7 || 7;
      end.setDate(end.getDate() + daysUntilSaturday);
      end.setHours(0, 0, 0, 0);
      return end;
    }

    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}
