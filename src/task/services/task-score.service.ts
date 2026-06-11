import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import { TaskDocument, TaskStatus } from '../task.schema';
import { TaskRepository } from '../repositories/task.repository';

@Injectable()
export class TaskScoreService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly userService: UserService,
  ) {}

  async adjustUserScore(userId: string, tasks: TaskDocument[]): Promise<void> {
    for (const task of tasks) {
      await this.adjustTaskScore(userId, task);
    }
  }

  async adjustCompletedTaskScore(task: TaskDocument): Promise<void> {
    const assigneeId = this.getAssigneeId(task);
    if (!assigneeId) {
      return;
    }

    await this.adjustTaskScore(assigneeId, task);
  }

  async adjustOverdueTasks(): Promise<void> {
    const tasks = await this.repository.findUnadjustedOverdue(new Date());
    for (const task of tasks) {
      const assigneeId = this.getAssigneeId(task);
      if (assigneeId) {
        await this.adjustTaskScore(assigneeId, task);
      }
    }
  }

  private async adjustTaskScore(
    userId: string,
    task: TaskDocument,
  ): Promise<void> {
    const score = this.calculateScore(task);
    if (score === null) {
      return;
    }

    const claimedTask = await this.repository.claimScoreAdjustment(task._id);
    if (!claimedTask) {
      return;
    }

    await this.userService.adjustSpecialistScore(userId, score);
  }

  private calculateScore(task: TaskDocument): 10 | -10 | null {
    if (!task.dueDate) {
      return null;
    }

    if (task.status === TaskStatus.DONE) {
      return task.doneTime && task.doneTime.getTime() <= task.dueDate.getTime()
        ? 10
        : -10;
    }

    return task.dueDate.getTime() < Date.now() ? -10 : null;
  }

  private getAssigneeId(task: TaskDocument): string | null {
    const assignee = task.assignedTo[0] as unknown as {
      _id?: { toString(): string };
      toString(): string;
    };

    if (!assignee) {
      return null;
    }

    return assignee._id?.toString() ?? assignee.toString();
  }
}
