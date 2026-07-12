import { Injectable, NotFoundException } from '@nestjs/common';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskPolicyService } from './fixed-task-policy.service';

@Injectable()
export class FixedTaskDeleteService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
  ) {}

  async delete(id: string): Promise<void> {
    const fixedTaskId = this.policy.toObjectId(id, 'fixed task ID');
    const template = await this.repository.findRawById(fixedTaskId);

    if (!template) {
      throw new NotFoundException('Fixed task template not found');
    }

    await this.repository.deleteByTitle(template.title);
  }
}
