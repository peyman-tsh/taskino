import { Injectable } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
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
    const taskProgressPercentage = this.calculateCompletionPercentage(
      completedTasks,
      tasks.length,
    );
    const fixedTaskProgressPercentage = this.calculateCompletionPercentage(
      this.sumFixedTaskRatingScores(fixedTasks),
      fixedTasks.length * 10,
    );
    const progressPercentage = this.calculateOverallProgress(
      taskProgressPercentage,
      fixedTaskProgressPercentage,
      tasks.length > 0,
      fixedTasks.length > 0,
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

  private sumFixedTaskRatingScores(fixedTasks: ProgressFixedTask[]): number {
    return fixedTasks.reduce((sum, task) => {
      const score = task.ratingScore ?? 0;
      if (!Number.isFinite(score)) return sum;

      return sum + Math.min(Math.max(score, 0), 10);
    }, 0);
  }

  private calculateOverallProgress(
    taskProgressPercentage: number,
    fixedTaskProgressPercentage: number,
    hasTasks: boolean,
    hasFixedTasks: boolean,
  ): number {
    if (hasTasks && hasFixedTasks) {
      return Math.round(
        fixedTaskProgressPercentage * 0.8 + taskProgressPercentage * 0.2,
      );
    }

    if (hasFixedTasks) return fixedTaskProgressPercentage;
    if (hasTasks) return taskProgressPercentage;

    return 0;
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

}
