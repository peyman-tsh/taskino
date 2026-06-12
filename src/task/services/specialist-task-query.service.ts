import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { TaskRepository } from '../repositories/task.repository';

@Injectable()
export class SpecialistTaskQueryService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly userService: UserService,
  ) {}

  async findBySpecialist(userId: string, page = 1, limit = 10) {
    await this.assertSpecialist(userId);
    const { data, total } = await this.repository.findPaginated(
      { assignedTo: new Types.ObjectId(userId) },
      page,
      limit,
    );

    return { data, total, page, limit };
  }

  private async assertSpecialist(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid specialist user ID');
    }

    const user = await this.userService.findById(userId);
    if (user.roles !== UserRole.SPECIALIST) {
      throw new ForbiddenException('User must have the specialist role');
    }
  }
}
