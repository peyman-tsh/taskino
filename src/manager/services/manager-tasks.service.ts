import { BadRequestException, Injectable } from '@nestjs/common';
import { ManagerTasksQueryDto } from '../dto/manager-tasks-query.dto';
import { ManagerTasksRepository } from '../repositories/manager-tasks.repository';
import { BaseManagerService } from './base-manager.service';

@Injectable()
export class ManagerTasksService extends BaseManagerService {
  private readonly expectedDailyMinutes = 8 * 60;

  constructor(private readonly repository: ManagerTasksRepository) {
    super();
  }

  async findAll(query: ManagerTasksQueryDto) {
    const { tasks, fixedTasks } = await this.repository.findAll(
      query.recurrence,
    );

    return {
      recurrence: query.recurrence ?? null,
      total: tasks.length + fixedTasks.length,
      totalTasks: tasks.length,
      totalFixedTasks: fixedTasks.length,
      tasks,
      fixedTasks,
    };
  }

  async getDailyFixedTaskDurationBalance(
    fromValue: string,
    toValue: string,
    userId?: string,
  ) {
    const from = this.parseBoundary(fromValue, false);
    const to = this.parseBoundary(toValue, true);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }
    if (userId) this.toObjectId(userId, 'user ID');

    const totalActualDurationMinutes =
      await this.repository.sumDailyDoneFixedTaskDuration(from, to, userId);

    return {
      from,
      to,
      userId,
      expectedDailyMinutes: this.expectedDailyMinutes,
      totalActualDurationMinutes,
      remainingMinutes: Math.max(
        0,
        this.expectedDailyMinutes - totalActualDurationMinutes,
      ),
    };
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
