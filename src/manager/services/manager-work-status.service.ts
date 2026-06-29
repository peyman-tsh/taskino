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
    const taskCounts = this.countStatuses(tasks, evaluatedAt, from, to);
    const fixedTaskCounts = this.countStatuses(
      fixedTasks,
      evaluatedAt,
      from,
      to,
    );

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
      users: this.groupByUser(tasks, fixedTasks, evaluatedAt, from, to),
    };
  }

  async getOverdueFixedTasks(
    _managerId: string,
    fromValue: string,
    toValue: string,
    userId?: string,
  ) {
    const { from, to } = this.parseDateRange(fromValue, toValue);
    const evaluatedAt = new Date();
    const data = await this.repository.findOverdueFixedTasks(
      from,
      to,
      evaluatedAt,
      userId,
    );

    return { from, to, evaluatedAt, total: data.length, userId, data };
  }

  async getDoneFixedTasks(
    _managerId: string,
    fromValue: string,
    toValue: string,
    userId?: string,
  ) {
    const { from, to } = this.parseDateRange(fromValue, toValue);
    const evaluatedAt = new Date();
    const data = await this.repository.findDoneFixedTasks(from, to, userId);

    return { from, to, evaluatedAt, total: data.length, userId, data };
  }

  private countStatuses(
    items: WorkStatusItem[],
    now: Date,
    from: Date,
    to: Date,
  ): WorkStatusCounts {
    const counts: WorkStatusCounts = {
      total: 0,
      done: 0,
      inProgress: 0,
      todo: 0,
      overdueUnfinished: 0,
    };

    for (const item of items) {
      if (this.isInProgress(item)) {
        counts.total += 1;
        counts.inProgress += 1;
        continue;
      }

      if (!this.isInSelectedRange(item, from, to)) continue;

      counts.total += 1;

      if (
        item.status === TaskStatus.DONE ||
        item.status === FixedTaskStatus.DONE
      ) {
        counts.done += 1;
        continue;
      }

      if (this.isOverdueInRange(item, now, from, to)) {
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
    from: Date,
    to: Date,
  ): UserWorkStatusCounts[] {
    const users = new Map<string, UserWorkStatusCounts>();

    for (const task of tasks) {
      const userCounts = this.getOrCreateUserCounts(users, task.user);
      if (!userCounts) continue;
      this.incrementTaskCounts(userCounts.tasks, task, now, from, to);
    }

    for (const fixedTask of fixedTasks) {
      const userCounts = this.getOrCreateUserCounts(users, fixedTask.user);
      if (!userCounts) continue;
      this.incrementFixedTaskCounts(
        userCounts.fixedTasks,
        fixedTask,
        now,
        from,
        to,
      );
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
    from: Date,
    to: Date,
  ): void {
    if (item.status === TaskStatus.IN_PROGRESS) {
      counts.total += 1;
      counts.inProgress += 1;
      return;
    }

    if (!this.isInSelectedRange(item, from, to)) return;

    counts.total += 1;

    if (item.status === TaskStatus.DONE) {
      counts.done += 1;
      return;
    }

    if (this.isOverdueInRange(item, now, from, to)) {
      counts.overdueUnfinished += 1;
      return;
    }

    counts.todo += 1;
  }

  private incrementFixedTaskCounts(
    counts: WorkStatusCounts,
    item: WorkStatusItem,
    now: Date,
    from: Date,
    to: Date,
  ): void {
    if (item.isActive && item.status === FixedTaskStatus.IN_PROGRESS) {
      counts.inProgress += 1;
      counts.total += 1;
      return;
    }

    if (item.isActive && item.status === FixedTaskStatus.TODO) {
      counts.todo += 1;
      counts.total += 1;
      return;
    }

    if (!this.isInSelectedRange(item, from, to)) return;

    if (item.status === FixedTaskStatus.DONE) {
      counts.done += 1;
      counts.total += 1;
      return;
    }

    if (this.isInactiveUnfinishedFixedTask(item) && this.isOverdueInRange(item, now, from, to)) {
      counts.overdueUnfinished += 1;
      counts.total += 1;
      return;
    }

    if (item.isActive) return;
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

  private isInProgress(item: WorkStatusItem): boolean {
    return (
      item.status === TaskStatus.IN_PROGRESS ||
      item.status === FixedTaskStatus.IN_PROGRESS
    );
  }

  private isInactiveUnfinishedFixedTask(item: WorkStatusItem): boolean {
    return (
      item.isActive === false &&
      (item.status === FixedTaskStatus.TODO ||
        item.status === FixedTaskStatus.IN_PROGRESS)
    );
  }

  private isOverdueInRange(
    item: WorkStatusItem,
    now: Date,
    from: Date,
    to: Date,
  ): boolean {
    if (!(item.startDate instanceof Date)) return false;

    const deadline = this.getDeadline(item);
    if (!deadline) return false;

    return (
      deadline.getTime() < now.getTime() &&
      this.isInSelectedRange(item, from, to)
    );
  }

  private isInSelectedRange(
    item: WorkStatusItem,
    from: Date,
    to: Date,
  ): boolean {
    if (!(item.startDate instanceof Date)) return false;

    const deadline = this.getDeadline(item);
    if (!deadline) return false;

    return (
      item.startDate.getTime() >= from.getTime() &&
      deadline.getTime() <= to.getTime()
    );
  }

  private getDeadline(item: WorkStatusItem): Date | null {
    const date = item.endDate ?? item.dueDate;
    if (!(date instanceof Date)) return null;

    const deadline = new Date(date);
    if (item.endTime) {
      const [hours, minutes] = item.endTime.split(':').map(Number);
      deadline.setHours(hours, minutes, 0, 0);
    }

    return deadline;
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

  private parseDateRange(
    fromValue: string,
    toValue: string,
  ): { from: Date; to: Date } {
    const from = this.parseBoundary(fromValue, false);
    const to = this.parseBoundary(toValue, true);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }

    return { from, to };
  }
}
