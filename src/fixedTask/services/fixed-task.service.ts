import { Injectable } from '@nestjs/common';
import { CreateFixedTaskDto } from '../dto/create-fixed-task.dto';
import { QueryFixedTaskDto } from '../dto/query-fixed-task.dto';
import { UpdateFixedTaskDto } from '../dto/update-fixed-task.dto';
import { FixedTaskCreationService } from './fixed-task-creation.service';
import { FixedTaskDeleteService } from './fixed-task-delete.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskUpdateService } from './fixed-task-update.service';
import { FixedTaskScoreService } from './fixed-task-score.service';

@Injectable()
export class FixedTaskService {
  constructor(
    private readonly creationService: FixedTaskCreationService,
    private readonly queryService: FixedTaskQueryService,
    private readonly updateService: FixedTaskUpdateService,
    private readonly deleteService: FixedTaskDeleteService,
    private readonly scoreService: FixedTaskScoreService,
  ) {}

  create(creatorId: string, dto: CreateFixedTaskDto) {
    return this.creationService.create(creatorId, dto);
  }

  async findAll(queryDto: QueryFixedTaskDto) {
    await this.scoreService.adjustOverdueTasks();
    return this.queryService.findAll(queryDto);
  }

  findById(id: string) {
    return this.queryService.findById(id);
  }

  getStatusCounts() {
    return this.queryService.getStatusCounts();
  }

  update(id: string, requesterId: string, dto: UpdateFixedTaskDto) {
    return this.updateService.update(id, requesterId, dto);
  }

  delete(id: string) {
    return this.deleteService.delete(id);
  }

  findActiveTemplates(name?: string) {
    return this.queryService.findActiveTemplates(name);
  }
}
