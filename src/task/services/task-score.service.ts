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
    if (!tasks.length) {
      return;
    }

    const now = new Date();
    const allCompletedOnTime = tasks.every(
      (task) =>
        task.status === TaskStatus.DONE &&
        task.dueDate !== undefined &&
        task.dueDate >= now,
    );
    const overdueTasks = tasks.filter(
      (task) =>
        task.status !== TaskStatus.DONE &&
        task.dueDate !== undefined &&
        task.dueDate < now,
    );

    if (allCompletedOnTime) {
      await this.applyScoreOnce(userId, tasks, 10);
    } else if (overdueTasks.length > 0) {
      await this.applyScoreOnce(userId, overdueTasks, -10);
    }
  }

  private async applyScoreOnce(
    userId: string,
    tasks: TaskDocument[],
    score: number,
  ): Promise<void> {
    const result = await this.repository.updateMany(
        {
          _id: { $in: tasks.map((task) => task._id) },
          scoreAdjusted: { $ne: true },
        },
        { $set: { scoreAdjusted: true } },
      );

    if (result.modifiedCount > 0) {
      await this.userService.increaseScore({ userId, score });
    }
  }
}
