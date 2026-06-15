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
    const result = await this.repository.deleteById(
      this.policy.toObjectId(id, 'fixed task ID'),
    );

    if (!result) {
      throw new NotFoundException('Fixed task template not found');
    }
  }
}
