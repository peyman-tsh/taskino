import { Injectable } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import {
  ProgressFixedTask,
  ProgressMetrics,
  ProgressTask,
} from '../types/user-progress.types';

@Injectable()
export class UserProgressCalculatorService {
  private readonly categoryWeight = 50;
  private readonly inProgressCredit = 0.5;

  calculate(
    tasks: ProgressTask[],
    fixedTasks: ProgressFixedTask[],
  ): ProgressMetrics {
    const completedTasks = this.countCompletedTasks(tasks);
    const onTimeTasks = this.countOnTimeTasks(tasks);
    const inProgressTasks = this.countInProgressTasks(tasks);
    const completedFixedTasks = this.countCompletedFixedTasks(fixedTasks);
    const inProgressFixedTasks = this.countInProgressFixedTasks(fixedTasks);
    const weights = this.calculateWeights(tasks.length, fixedTasks.length);
    const progressPercentage = Math.round(
      this.calculateCategoryProgress(
        tasks.length,
        onTimeTasks,
        inProgressTasks,
        weights.task,
      ) +
        this.calculateCategoryProgress(
          fixedTasks.length,
          completedFixedTasks,
          inProgressFixedTasks,
          weights.fixedTask,
        ),
    );

    return {
      totalTasks: tasks.length,
      completedTasks,
      onTimeTasks,
      inProgressTasks,
      totalFixedTasks: fixedTasks.length,
      completedFixedTasks,
      inProgressFixedTasks,
      progressPercentage,
      performanceStatus: this.calculatePerformanceStatus(progressPercentage),
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

  private countInProgressTasks(tasks: ProgressTask[]): number {
    return tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
  }

  private countCompletedFixedTasks(fixedTasks: ProgressFixedTask[]): number {
    return fixedTasks.filter((task) => task.status === FixedTaskStatus.DONE)
      .length;
  }

  private countInProgressFixedTasks(
    fixedTasks: ProgressFixedTask[],
  ): number {
    return fixedTasks.filter(
      (task) => task.status === FixedTaskStatus.IN_PROGRESS,
    ).length;
  }

  private calculateCategoryProgress(
    total: number,
    successful: number,
    inProgress: number,
    weight: number,
  ): number {
    if (total === 0) return 0;

    const earnedItems = successful + inProgress * this.inProgressCredit;
    return (earnedItems / total) * weight;
  }

  private calculateWeights(
    totalTasks: number,
    totalFixedTasks: number,
  ): { task: number; fixedTask: number } {
    if (totalTasks > 0 && totalFixedTasks > 0) {
      return { task: this.categoryWeight, fixedTask: this.categoryWeight };
    }

    if (totalTasks > 0) return { task: 100, fixedTask: 0 };
    if (totalFixedTasks > 0) return { task: 0, fixedTask: 100 };
    return { task: 0, fixedTask: 0 };
  }

  private calculatePerformanceStatus(
    progressPercentage: number,
  ): UserPerformanceStatus {
    if (progressPercentage <= 40) return UserPerformanceStatus.WEAK;
    if (progressPercentage <= 70) return UserPerformanceStatus.NORMAL;
    return UserPerformanceStatus.GOOD;
  }
}
