import { Injectable } from '@nestjs/common';
import { ManagerTasksQueryDto } from '../dto/manager-tasks-query.dto';
import { ManagerTasksRepository } from '../repositories/manager-tasks.repository';

@Injectable()
export class ManagerTasksService {
  constructor(private readonly repository: ManagerTasksRepository) {}

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
}
