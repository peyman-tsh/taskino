import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';

@Injectable()
export class SpecialistFixedTaskQueryService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly userService: UserService,
  ) {}

  async findBySpecialist(userId: string, page = 1, limit = 10) {
    await this.assertAllowedAssignee(userId);
    const { data, total } = await this.repository.findPaginated(
      { assignedTo: new Types.ObjectId(userId) },
      page,
      limit,
    );

    return { data, total, page, limit };
  }

  private async assertAllowedAssignee(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid assignee user ID');
    }

    const user = await this.userService.findById(userId);
    if (![UserRole.SPECIALIST, UserRole.SUPERVISOR].includes(user.roles as UserRole)) {
      throw new ForbiddenException(
        'User must have the specialist or supervisor role',
      );
    }
  }
}
