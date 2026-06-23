import { BadRequestException, Injectable } from '@nestjs/common';
import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { ManagerWorkStatusRepository } from '../repositories/manager-work-status.repository';
import {
  UserWorkStatusCounts,
  WorkStatusCounts,
  WorkStatusItem,
  WorkStatusUser,
  WorkStatusUserItem,
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

  async getUserStatusCounts(
    managerId: string,
    fromValue: string,
    toValue: string,
    userId?: string,
  ) {
    const from = this.parseBoundary(fromValue, false);
    const to = this.parseBoundary(toValue, true);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }

    const { tasks, fixedTasks } = await this.repository.findByDateRangeForUsers(
      from,
      to,
      managerId,
      userId,
    );
    const evaluatedAt = new Date();

    return {
      from,
      to,
      evaluatedAt,
      users: this.groupByUser(tasks, fixedTasks, evaluatedAt),
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

  private groupByUser(
    tasks: WorkStatusUserItem[],
    fixedTasks: WorkStatusUserItem[],
    now: Date,
  ): UserWorkStatusCounts[] {
    const users = new Map<string, UserWorkStatusCounts>();

    for (const task of tasks) {
      const userCounts = this.getOrCreateUserCounts(users, task.user);
      if (!userCounts) continue;
      this.incrementTaskCounts(userCounts.tasks, task, now);
    }

    for (const fixedTask of fixedTasks) {
      const userCounts = this.getOrCreateUserCounts(users, fixedTask.user);
      if (!userCounts) continue;
      this.incrementFixedTaskCounts(userCounts.fixedTasks, fixedTask, now);
    }

    return [...users.values()].sort((first, second) =>
      `${first.firstName ?? ''} ${first.lastName ?? ''}`.localeCompare(
        `${second.firstName ?? ''} ${second.lastName ?? ''}`,
      ),
    );
  }

  private getOrCreateUserCounts(
    users: Map<string, UserWorkStatusCounts>,
    user?: WorkStatusUser,
  ): UserWorkStatusCounts | null {
    if (!user?.userId) return null;

    const existing = users.get(user.userId);
    if (existing) return existing;

    const created = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      tasks: this.createEmptyCounts(),
      fixedTasks: this.createEmptyCounts(),
    };
    users.set(user.userId, created);
    return created;
  }

  private incrementTaskCounts(
    counts: WorkStatusCounts,
    item: WorkStatusItem,
    now: Date,
  ): void {
    counts.total += 1;

    if (item.status === TaskStatus.DONE) {
      counts.done += 1;
      return;
    }

    if (this.isOverdue(item, now)) {
      counts.overdueUnfinished += 1;
      return;
    }

    if (item.status === TaskStatus.IN_PROGRESS) {
      counts.inProgress += 1;
      return;
    }

    counts.todo += 1;
  }

  private incrementFixedTaskCounts(
    counts: WorkStatusCounts,
    item: WorkStatusItem,
    now: Date,
  ): void {
    if (item.isActive) {
      if (item.status === FixedTaskStatus.DONE) {
        counts.done += 1;
        counts.total += 1;
        return;
      }

      if (item.status === FixedTaskStatus.IN_PROGRESS) {
        counts.inProgress += 1;
        counts.total += 1;
        return;
      }

      if (item.status === FixedTaskStatus.TODO) {
        counts.todo += 1;
        counts.total += 1;
      }
      return;
    }

    if (item.status !== FixedTaskStatus.DONE && this.isOverdue(item, now)) {
      counts.overdueUnfinished += 1;
      counts.total += 1;
    }
  }

  private createEmptyCounts(): WorkStatusCounts {
    return {
      total: 0,
      done: 0,
      inProgress: 0,
      todo: 0,
      overdueUnfinished: 0,
    };
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
