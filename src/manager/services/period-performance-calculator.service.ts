import { Injectable } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskRecurrence, TaskStatus } from '../../task/task.schema';
import { calculatePerformanceStatus } from '../utils/performance-status.util';
import { PerformancePeriod } from './performance-period.service';
import {
  PeriodPerformanceFixedTask,
  PeriodPerformanceMetrics,
  PeriodPerformanceTask,
} from '../types/period-performance.types';

@Injectable()
export class PeriodPerformanceCalculatorService {
  calculate(
    recurrence: TaskRecurrence,
    period: PerformancePeriod,
    tasks: PeriodPerformanceTask[],
    fixedTasks: PeriodPerformanceFixedTask[],
  ): PeriodPerformanceMetrics {
    const completedTasksInPeriod = tasks.filter(
      (task) =>
        task.status === TaskStatus.DONE &&
        this.isWithinPeriod(task.doneTime, period),
    ).length;
    const onTimeTasks = tasks.filter(
      (task) =>
        task.status === TaskStatus.DONE &&
        this.isWithinPeriod(task.doneTime, period) &&
        task.doneTime instanceof Date &&
        task.dueDate instanceof Date &&
        task.doneTime.getTime() < task.dueDate.getTime(),
    ).length;
    const completedFixedTasksInPeriod = fixedTasks.filter(
      (task) =>
        task.status === FixedTaskStatus.DONE &&
        this.isWithinPeriod(task.doneTime, period),
    ).length;
    const totalWork = tasks.length + fixedTasks.length;
    const completedWork =
      completedTasksInPeriod + completedFixedTasksInPeriod;
    const progressPercentage =
      totalWork === 0 ? 0 : Math.round((completedWork / totalWork) * 100);

    return {
      recurrence,
      periodStart: period.start,
      periodEnd: period.end,
      totalTasks: tasks.length,
      completedTasksInPeriod,
      onTimeTasks,
      totalFixedTasks: fixedTasks.length,
      completedFixedTasksInPeriod,
      progressPercentage,
      performanceStatus: calculatePerformanceStatus(progressPercentage),
    };
  }

  private isWithinPeriod(
    value: Date | undefined,
    period: PerformancePeriod,
  ): boolean {
    return (
      value instanceof Date &&
      value.getTime() >= period.start.getTime() &&
      value.getTime() < period.end.getTime()
    );
  }
}
