import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { isValidTimeRange } from '../../common/constants/time.constants';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class TaskPolicyService {
  constructor(private readonly userService: UserService) {}

  validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID: ${id}`);
    }
  }

  normalizeAssignedTo(assignedTo: string | string[] | undefined): string[] {
    if (Array.isArray(assignedTo)) {
      return assignedTo;
    }

    return assignedTo ? [assignedTo] : [];
  }

  assertSingleAssignee(assignedTo: string[]): void {
    if (assignedTo.length !== 1) {
      throw new BadRequestException(
        'A task must be assigned to exactly one user',
      );
    }
  }

  assertAtMostOneAssignee(assignedTo: string[]): void {
    if (assignedTo.length > 1) {
      throw new BadRequestException(
        'A task can currently be assigned to only one user',
      );
    }
  }

  assertValidAssigneeIds(assignedTo: string[]): void {
    if (assignedTo.some((userId) => !Types.ObjectId.isValid(userId))) {
      throw new BadRequestException('Invalid assignedTo user IDs');
    }
  }

  parseDateTime(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} is not a valid date-time`);
    }

    return date;
  }

  assertValidDeadline(startDate?: Date, dueDate?: Date): void {
    if (startDate && dueDate && dueDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('dueDate must be after startDate');
    }
  }

  assertValidTimeRange(startTime?: string, endTime?: string): void {
    if (!isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  async assertParticipants(creatorId: string, assigneeIds: string[]) {
    const participants = await this.userService.findTaskParticipantsByIds([
      creatorId,
      ...assigneeIds,
    ]);
    const creator = participants.find(
      (participant) => participant.userId === creatorId,
    );

    if (
      !creator ||
      ![UserRole.MANAGER, UserRole.SUPERVISOR].includes(
        creator.role as UserRole,
      )
    ) {
      throw new BadRequestException(
        'Task creator must have the manager or supervisor role',
      );
    }

    const invalidAssignee = participants.find(
      (participant) =>
        participant.userId !== creatorId &&
        ![UserRole.SPECIALIST, UserRole.SUPERVISOR].includes(
          participant.role as UserRole,
        ),
    );

    if (invalidAssignee) {
      throw new BadRequestException(
        'Task assignees must have the specialist or supervisor role',
      );
    }
  }

  async assertSpecialist(userId: string): Promise<void> {
    const [participant] = await this.userService.findTaskParticipantsByIds([
      userId,
    ]);

    if (!participant || participant.role !== UserRole.SPECIALIST) {
      throw new BadRequestException(
        'Only a specialist can create an extra task',
      );
    }
  }

  findUserByName(firstName: string, lastName: string) {
    return this.userService.findByName(firstName, lastName);
  }
}
