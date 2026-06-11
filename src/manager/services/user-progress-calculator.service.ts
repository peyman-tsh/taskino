import { Injectable } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import {
  ProgressFixedTask,
  ProgressMetrics,
  ProgressTask,
} from './user-progress.types';

@Injectable()
export class UserProgressCalculatorService {
  calculate(
    tasks: ProgressTask[],
    fixedTasks: ProgressFixedTask[],
  ): ProgressMetrics {
    const completedTasks = this.countCompletedTasks(tasks);
    const onTimeTasks = this.countOnTimeTasks(tasks);
    const completedFixedTasks = this.countCompletedFixedTasks(fixedTasks);
    const totalWork = tasks.length + fixedTasks.length;
    const completedWork = completedTasks + completedFixedTasks;

    return {
      totalTasks: tasks.length,
      completedTasks,
      onTimeTasks,
      totalFixedTasks: fixedTasks.length,
      completedFixedTasks,
      progressPercentage: this.calculatePercentage(completedWork, totalWork),
      performanceStatus: this.calculatePerformanceStatus(
        totalWork,
        onTimeTasks,
        tasks.length,
        completedFixedTasks,
        fixedTasks.length,
      ),
    };
  }

  private countCompletedTasks(tasks: ProgressTask[]): number {
    return tasks.filter((task) => task.status === TaskStatus.DONE).length;
  }

  private countOnTimeTasks(tasks: ProgressTask[]): number {
    return tasks.filter(
      (task) =>
        task.status === TaskStatus.DONE &&
        task.doneTime instanceof Date &&
        task.dueDate instanceof Date &&
        task.doneTime.getTime() < task.dueDate.getTime(),
    ).length;
  }

  private countCompletedFixedTasks(fixedTasks: ProgressFixedTask[]): number {
    return fixedTasks.filter((task) => task.status === FixedTaskStatus.DONE)
      .length;
  }

  private calculatePercentage(completedWork: number, totalWork: number): number {
    return totalWork === 0 ? 0 : Math.round((completedWork / totalWork) * 100);
  }

  private calculatePerformanceStatus(
    totalWork: number,
    onTimeTasks: number,
    totalTasks: number,
    completedFixedTasks: number,
    totalFixedTasks: number,
  ): UserPerformanceStatus {
    const allTasksOnTime = onTimeTasks === totalTasks;
    const allFixedTasksCompleted = completedFixedTasks === totalFixedTasks;

    return totalWork > 0 && allTasksOnTime && allFixedTasksCompleted
      ? UserPerformanceStatus.GOOD
      : UserPerformanceStatus.WEAK;
  }
}
