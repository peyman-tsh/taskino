import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { TaskRepository } from '../repositories/task.repository';
import { TaskDocument, TaskRecurrence, TaskStatus } from '../task.schema';
import { TaskPolicyService } from './task-policy.service';
import { TaskScoreService } from './task-score.service';

export interface TaskListFilters {
  createdBy?: string;
  assignedTo?: string;
  status?: TaskStatus;
  startDate?: string;
  endDate?: string;
  recurrence?: TaskRecurrence;
}

@Injectable()
export class TaskQueryService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly policy: TaskPolicyService,
    private readonly scoreService: TaskScoreService,
  ) {}

  async findAll(page: number, limit: number, filters?: TaskListFilters) {
    await this.scoreService.adjustOverdueTasks();
    const query = this.buildFilter(filters);
    const { data, total } = await this.repository.findPaginated(
      query,
      page,
      limit,
    );

    return { data, total, page, limit };
  }

  async findActivePublicTasks(page: number, limit: number) {
    const { data, total } = await this.repository.findPaginated(
      {
        isPublic: true,
        endDate: { $type: 'date', $gte: new Date() },
      },
      page,
      limit,
    );

    return { data, total, page, limit };
  }

  private buildFilter(filters?: TaskListFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    this.addParticipantFilters(query, filters);
    this.addStatusAndRecurrenceFilters(query, filters);
    this.addDateRangeFilters(query, filters);
    return query;
  }

  private addParticipantFilters(
    query: Record<string, unknown>,
    filters?: TaskListFilters,
  ): void {
    if (filters?.createdBy && Types.ObjectId.isValid(filters.createdBy)) {
      query.createdBy = new Types.ObjectId(filters.createdBy);
    }
    if (filters?.assignedTo && Types.ObjectId.isValid(filters.assignedTo)) {
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }
  }

  private addStatusAndRecurrenceFilters(
    query: Record<string, unknown>,
    filters?: TaskListFilters,
  ): void {
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.recurrence) {
      if (!Object.values(TaskRecurrence).includes(filters.recurrence)) {
        throw new BadRequestException('Invalid task recurrence');
      }
      query.recurrence = filters.recurrence;
    }
  }

  private addDateRangeFilters(
    query: Record<string, unknown>,
    filters?: TaskListFilters,
  ): void {
    const rangeStart = filters?.startDate
      ? this.policy.parseDateTime(filters.startDate, 'startDate')
      : undefined;
    const rangeEnd = filters?.endDate
      ? this.policy.parseDateTime(filters.endDate, 'endDate')
      : undefined;

    if (rangeStart && rangeEnd && rangeEnd.getTime() < rangeStart.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
    if (rangeStart) {
      query.dueDate = { $gte: rangeStart };
    }
    if (rangeEnd) {
      query.startDate = { $lte: rangeEnd };
    }
  }
}
