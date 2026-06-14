import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { isValidTimeRange } from '../../common/constants/time.constants';
import { UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';

type TaskParticipant = Awaited<
  ReturnType<UserService['findTaskParticipantsByIds']>
>[number];

const CREATOR_ROLES = [UserRole.MANAGER, UserRole.SUPERVISOR];
const ASSIGNEE_ROLES = [UserRole.SPECIALIST, UserRole.SUPERVISOR];

@Injectable()
export class FixedTaskPolicyService {
  constructor(private readonly userService: UserService) {}

  toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return new Types.ObjectId(id);
  }

  assertValidTimeRange(startTime?: string, endTime?: string): void {
    if (!isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  parseDate(value: string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return date;
  }

  assertValidDateRange(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  async validateParticipants(creatorId: string, assignedTo: string) {
    const participants = await this.userService.findTaskParticipantsByIds([
      creatorId,
      assignedTo,
    ]);
    const creator = this.findParticipant(participants, creatorId);
    const assignee = this.findParticipant(participants, assignedTo);

    this.assertAllowedRole(
      creator,
      CREATOR_ROLES,
      'Fixed task creator must have the manager or supervisor role',
    );
    this.assertAllowedRole(
      assignee,
      ASSIGNEE_ROLES,
      'Fixed task assignee must have the specialist or supervisor role',
    );
    this.assertSameWorkField(creator, assignee);
  }

  private findParticipant(
    participants: TaskParticipant[],
    userId: string,
  ): TaskParticipant {
    const participant = participants.find((item) => item.userId === userId);
    if (!participant) {
      throw new BadRequestException('Fixed task participant was not found');
    }

    return participant;
  }

  private assertAllowedRole(
    participant: TaskParticipant,
    allowedRoles: UserRole[],
    message: string,
  ): void {
    if (!allowedRoles.includes(participant.role as UserRole)) {
      throw new BadRequestException(message);
    }
  }

  private assertSameWorkField(
    creator: TaskParticipant,
    assignee: TaskParticipant,
  ): void {
    if (creator.workField !== assignee.workField) {
      throw new BadRequestException(
        'Fixed task creator and assignee must have the same work field',
      );
    }
  }
}
