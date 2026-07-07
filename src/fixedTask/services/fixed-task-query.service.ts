import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryFixedTaskDto } from '../dto/query-fixed-task.dto';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskRecurrence, FixedTaskStatus } from '../fixed-task.schema';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import {
  getPersianMonthLength,
  getTehranDateParts,
  getTehranPersianDateParts,
  tehranPersianDateTimeToUtc,
} from '../../common/utils/tehran-time.util';

@Injectable()
export class FixedTaskQueryService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
  ) {}

  async findAll(queryDto: QueryFixedTaskDto) {
    const query = this.buildFilter(queryDto);
    const { data, total } = await this.repository.findPaginated(
      query,
      queryDto.page,
      queryDto.limit,
    );

    return { data, total, page: queryDto.page, limit: queryDto.limit };
  }

  async findById(id: string) {
    const template = await this.repository.findById(
      this.policy.toObjectId(id, 'fixed task ID'),
    );

    if (!template) {
      throw new NotFoundException('Fixed task template not found');
    }

    return template;
  }

  async getStatusCounts() {
    const [
      totalFixedTasks,
      todoFixedTasks,
      inProgressFixedTasks,
      doneFixedTasks,
      activeDatedTodoFixedTasks,
    ] = await Promise.all([
        this.repository.count({}),
        this.repository.count({ status: FixedTaskStatus.TODO }),
        this.repository.count({ status: FixedTaskStatus.IN_PROGRESS }),
        this.repository.count({ status: FixedTaskStatus.DONE }),
        this.repository.count({
          status: FixedTaskStatus.TODO,
          startDate: { $type: 'date' },
          endDate: { $type: 'date', $gte: new Date() },
        }),
      ]);

    return {
      totalFixedTasks,
      todoFixedTasks,
      inProgressFixedTasks,
      doneFixedTasks,
      activeDatedTodoFixedTasks,
    };
  }

  findActiveTemplates(userId?: string) {
    const filter: Record<string, unknown> = { isActive: true };

    if (userId) {
      filter.assignedTo = this.policy.toObjectId(
        userId,
        'assigned user ID',
      );
    }

    filter.$or = this.buildActiveScheduleFilter(new Date());

    return this.repository.findActive(filter);
  }

  private buildActiveScheduleFilter(now: Date): Record<string, unknown>[] {
    const tehranParts = getTehranDateParts(now);
    const weekday = new Date(
      Date.UTC(tehranParts.year, tehranParts.month - 1, tehranParts.day),
    ).getUTCDay();
    const persianParts = getTehranPersianDateParts(now);
    const monthLength = getPersianMonthLength(
      persianParts.year,
      persianParts.month,
    );
    const monthStart = tehranPersianDateTimeToUtc(
      persianParts.year,
      persianParts.month,
      1,
    );
    const monthEnd = tehranPersianDateTimeToUtc(
      persianParts.year,
      persianParts.month,
      monthLength,
      23,
      59,
      59,
      999,
    );

    return [
      {
        recurrence: FixedTaskRecurrence.DAILY,
        'scheduleConfig.weekdays': weekday,
      },
      {
        recurrence: FixedTaskRecurrence.WEEKLY,
        'scheduleConfig.weekdays': weekday,
      },
      {
        recurrence: FixedTaskRecurrence.MONTHLY,
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      },
    ];
  }

  private buildFilter(queryDto: QueryFixedTaskDto): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (queryDto.title) {
      filter.title = {
        $regex: this.escapeRegex(queryDto.title),
        $options: 'i',
      };
    }
    if (queryDto.assignedTo) {
      filter.assignedTo = this.policy.toObjectId(
        queryDto.assignedTo,
        'assigned user ID',
      );
    }
    if (queryDto.recurrence) {
      if (!Object.values(FixedTaskRecurrence).includes(queryDto.recurrence)) {
        throw new BadRequestException('Invalid fixed task recurrence');
      }
      filter.recurrence = queryDto.recurrence;
    }
    if (queryDto.status) filter.status = queryDto.status;
    if (queryDto.isActive !== undefined) filter.isActive = queryDto.isActive;

    const rangeStart = queryDto.startDate
      ? this.policy.parseDate(queryDto.startDate, 'startDate')
      : undefined;
    const rangeEnd = queryDto.endDate
      ? this.policy.parseDate(queryDto.endDate, 'endDate')
      : undefined;
    this.policy.assertValidDateRange(rangeStart, rangeEnd);

    if (rangeStart) filter.endDate = { $gte: rangeStart };
    if (rangeEnd) filter.startDate = { $lte: rangeEnd };
    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
