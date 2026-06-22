import { BadRequestException, Injectable } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { ManagerWorkStatusRepository } from '../repositories/manager-work-status.repository';
import {
  WorkStatusCounts,
  WorkStatusItem,
} from '../types/work-status-range.types';

@Injectable()
export class ManagerWorkStatusService {
  constructor(
    private readonly repository: ManagerWorkStatusRepository,
  ) {}

  async getStatusCounts(
    managerId: string,
    fromValue: string,
    toValue: string,
  ) {
    const from = this.parseBoundary(fromValue, false);
    const to = this.parseBoundary(toValue, true);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }

    const { tasks, fixedTasks } = await this.repository.findByDateRange(
      from,
      to,
      managerId,
    );
    const evaluatedAt = new Date();
    const taskCounts = this.countStatuses(tasks, evaluatedAt);
    const fixedTaskCounts = this.countStatuses(fixedTasks, evaluatedAt);

    return {
      from,
      to,
      evaluatedAt,
      total: taskCounts.total + fixedTaskCounts.total,
      done: taskCounts.done + fixedTaskCounts.done,
      inProgress: taskCounts.inProgress + fixedTaskCounts.inProgress,
      todo: taskCounts.todo + fixedTaskCounts.todo,
      overdueUnfinished:
        taskCounts.overdueUnfinished + fixedTaskCounts.overdueUnfinished,
      tasks: taskCounts,
      fixedTasks: fixedTaskCounts,
    };
  }

  private countStatuses(
    items: WorkStatusItem[],
    now: Date,
  ): WorkStatusCounts {
    const counts: WorkStatusCounts = {
      total: items.length,
      done: 0,
      inProgress: 0,
      todo: 0,
      overdueUnfinished: 0,
    };

    for (const item of items) {
      if (
        item.status === TaskStatus.DONE ||
        item.status === FixedTaskStatus.DONE
      ) {
        counts.done += 1;
        continue;
      }

      if (this.isOverdue(item, now)) {
        counts.overdueUnfinished += 1;
        continue;
      }

      if (
        item.status === TaskStatus.IN_PROGRESS ||
        item.status === FixedTaskStatus.IN_PROGRESS
      ) {
        counts.inProgress += 1;
      } else {
        counts.todo += 1;
      }
    }

    return counts;
  }

  private isOverdue(item: WorkStatusItem, now: Date): boolean {
    const date = item.endDate ?? item.dueDate;
    if (!(date instanceof Date)) return false;

    const deadline = new Date(date);
    if (item.endTime) {
      const [hours, minutes] = item.endTime.split(':').map(Number);
      deadline.setHours(hours, minutes, 0, 0);
    } else {
      deadline.setHours(23, 59, 59, 999);
    }

    return deadline.getTime() < now.getTime();
  }

  private parseBoundary(value: string, endOfDay: boolean): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (endOfDay) date.setHours(23, 59, 59, 999);
      else date.setHours(0, 0, 0, 0);
    }
    return date;
  }
}
