import { Injectable } from '@nestjs/common';
import {
  FixedTaskRatingStatus,
  FixedTaskStatus,
} from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { calculatePerformanceStatus } from '../utils/performance-status.util';
import {
  ProgressFixedTask,
  ProgressMetrics,
  ProgressTask,
} from '../types/user-progress.types';

@Injectable()
export class UserProgressCalculatorService {
  calculate(
    tasks: ProgressTask[],
    fixedTasks: ProgressFixedTask[],
  ): ProgressMetrics {
    const completedTasks = this.countByStatus(tasks, TaskStatus.DONE);
    const inProgressTasks = this.countByStatus(
      tasks,
      TaskStatus.IN_PROGRESS,
    );
    const completedFixedTasks = this.countByStatus(
      fixedTasks,
      FixedTaskStatus.DONE,
    );
    const inProgressFixedTasks = this.countByStatus(
      fixedTasks,
      FixedTaskStatus.IN_PROGRESS,
    );
    const onTimeTasks = this.countOnTimeTasks(tasks);
    const onTimeFixedTasks = this.countOnTimeFixedTasks(fixedTasks);
    const ratingProgressBoost = this.calculateRatingProgressBoost(fixedTasks);
    const taskProgressPercentage = this.calculateCompletionPercentage(
      onTimeTasks,
      tasks.length,
    );
    const fixedTaskProgressPercentage = this.calculateCompletionPercentage(
      onTimeFixedTasks,
      fixedTasks.length,
    );
    const progressPercentage = this.calculateOverallProgress(
      onTimeTasks,
      onTimeFixedTasks,
      tasks.length,
      fixedTasks.length,
      ratingProgressBoost,
    );

    return {
      totalTasks: tasks.length,
      completedTasks,
      onTimeTasks,
      inProgressTasks,
      taskProgressPercentage,
      totalFixedTasks: fixedTasks.length,
      completedFixedTasks,
      onTimeFixedTasks,
      inProgressFixedTasks,
      fixedTaskProgressPercentage,
      progressPercentage,
      performanceStatus: calculatePerformanceStatus(progressPercentage),
    };
  }

  private countByStatus<T extends { status: string }>(
    items: T[],
    status: string,
  ): number {
    return items.filter((item) => item.status === status).length;
  }

  private countOnTimeTasks(tasks: ProgressTask[]): number {
    return tasks.filter((task) => {
      const deadline = this.getTaskDeadline(task);
      return (
        task.status === TaskStatus.DONE &&
        task.doneTime instanceof Date &&
        deadline !== null &&
        task.doneTime.getTime() <= deadline.getTime()
      );
    }).length;
  }

  private countOnTimeFixedTasks(fixedTasks: ProgressFixedTask[]): number {
    return fixedTasks.filter((task) => {
      const deadline = this.getFixedTaskDeadline(task.endDate, task.endTime);
      return (
        task.status === FixedTaskStatus.DONE &&
        task.doneTime instanceof Date &&
        deadline !== null &&
        task.doneTime.getTime() <= deadline.getTime()
      );
    }).length;
  }

  private calculateCompletionPercentage(
    completed: number,
    total: number,
  ): number {
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  private calculateOverallProgress(
    completedTasks: number,
    completedFixedTasks: number,
    totalTasks: number,
    totalFixedTasks: number,
    ratingProgressBoost = 0,
  ): number {
    const totalWork = totalTasks + totalFixedTasks;
    if (totalWork === 0) return Math.min(100, ratingProgressBoost);

    const baseProgress = Math.round(
      ((completedTasks + completedFixedTasks) / totalWork) * 100,
    );
    return Math.min(100, baseProgress + ratingProgressBoost);
  }

  private getFixedTaskDeadline(
    endDate?: Date,
    endTime?: string,
  ): Date | null {
    if (!(endDate instanceof Date)) return null;

    const deadline = new Date(endDate);
    if (!endTime) {
      deadline.setHours(23, 59, 59, 999);
      return deadline;
    }

    const [hours, minutes] = endTime.split(':').map(Number);
    deadline.setHours(hours, minutes, 0, 0);
    return deadline;
  }

  private getTaskDeadline(task: ProgressTask): Date | null {
    const deadlineDate = task.endDate ?? task.dueDate;
    if (!(deadlineDate instanceof Date)) return null;

    const deadline = new Date(deadlineDate);
    if (!task.endTime) {
      deadline.setHours(23, 59, 59, 999);
      return deadline;
    }

    const [hours, minutes] = task.endTime.split(':').map(Number);
    deadline.setHours(hours, minutes, 0, 0);
    return deadline;
  }

  private calculateRatingProgressBoost(
    fixedTasks: ProgressFixedTask[],
  ): number {
    return fixedTasks.reduce((total, task) => {
      if (task.status !== FixedTaskStatus.DONE) return total;
      if (task.ratingStatus !== FixedTaskRatingStatus.GOOD) return total;
      return total + (task.ratingScore ?? 0);
    }, 0);
  }
}
