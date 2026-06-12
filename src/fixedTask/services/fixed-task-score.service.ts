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
    const tasks = await this.repository.findUnadjustedIncomplete();
    for (const task of tasks) {
      await this.adjustTaskScore(task);
    }
  }

  private calculateScore(
    task: FixedTaskTemplateDocument,
  ): 10 | -10 | null {
    const deadline = this.getScoreDeadline(task);
    if (!deadline) {
      return null;
    }

    if (task.status === FixedTaskStatus.DONE) {
      return task.doneTime && task.doneTime.getTime() <= deadline.getTime()
        ? 10
        : -10;
    }

    return deadline.getTime() < Date.now() ? -10 : null;
  }

  private getScoreDeadline(task: FixedTaskTemplateDocument): Date | null {
    if (!task.endDate) {
      return null;
    }

    const deadline = new Date(task.endDate);
    if (task.endTime) {
      const [hours, minutes] = task.endTime.split(':').map(Number);
      deadline.setHours(hours, minutes, 0, 0);
    }
    return deadline;
  }

  getNextDeadline(
    recurrence: FixedTaskRecurrence,
    endTime?: string,
    now = new Date(),
  ): Date {
    if (recurrence === FixedTaskRecurrence.DAILY) {
      const deadline = this.applyDeadlineTime(new Date(now), endTime);
      if (deadline.getTime() <= now.getTime()) {
        deadline.setDate(deadline.getDate() + 1);
      }
      return deadline;
    }

    if (recurrence === FixedTaskRecurrence.WEEKLY) {
      const deadline = new Date(now);
      const daysUntilFriday = (5 - deadline.getDay() + 7) % 7;
      deadline.setDate(deadline.getDate() + daysUntilFriday);
      this.applyDeadlineTime(deadline, endTime);
      if (deadline.getTime() <= now.getTime()) {
        deadline.setDate(deadline.getDate() + 7);
      }
      return deadline;
    }

    const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.applyDeadlineTime(deadline, endTime);
    if (deadline.getTime() <= now.getTime()) {
      deadline.setMonth(deadline.getMonth() + 2, 0);
      this.applyDeadlineTime(deadline, endTime);
    }
    return deadline;
  }

  private applyDeadlineTime(date: Date, endTime?: string): Date {
    if (endTime) {
      const [hours, minutes] = endTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      return date;
    }

    date.setHours(23, 59, 59, 999);
    return date;
  }
}
