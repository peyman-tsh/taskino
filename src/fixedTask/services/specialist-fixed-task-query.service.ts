import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskStatus } from '../fixed-task.schema';

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

  async findCompletedByUser(userId: string, page = 1, limit = 10) {
    await this.assertAllowedAssignee(userId);
    const { data, total } = await this.repository.findPaginated(
      {
        assignedTo: new Types.ObjectId(userId),
        status: FixedTaskStatus.DONE,
        isActive: true,
      },
      page,
      limit,
    );

    return { data, total, page, limit };
  }

  async findCompletedByUserInDateRange(
    userId: string,
    fromValue: string,
    toValue: string,
  ) {
    await this.assertAllowedAssignee(userId);
    const from = this.parseDate(fromValue);
    const to = this.parseDate(toValue);
    if (to.getTime() < from.getTime()) {
      throw new BadRequestException('to must be on or after from');
    }

    const data = await this.repository.findDoneByUserInDateRange(
      new Types.ObjectId(userId),
      from,
      to,
    );

    return {
      userId,
      from,
      to,
      total: data.length,
      data,
    };
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

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    return date;
  }
}
