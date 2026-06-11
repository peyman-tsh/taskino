import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserService } from '../../user/services/user.service';
import { Task, TaskDocument, TaskStatus } from '../task.schema';

@Injectable()
export class TaskScoreService {
  constructor(
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
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
    const result = await this.taskModel
      .updateMany(
        {
          _id: { $in: tasks.map((task) => task._id) },
          scoreAdjusted: { $ne: true },
        },
        { $set: { scoreAdjusted: true } },
      )
      .exec();

    if (result.modifiedCount > 0) {
      await this.userService.increaseScore({ userId, score });
    }
  }
}
