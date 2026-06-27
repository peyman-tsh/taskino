import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateFixedTaskDto } from '../dto/create-fixed-task.dto';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskStatus } from '../fixed-task.schema';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';

@Injectable()
export class FixedTaskCreationService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
    private readonly deadlineService: FixedTaskDeadlineService,
    private readonly notificationService: FixedTaskNotificationService,
    private readonly queryService: FixedTaskQueryService,
  ) {}

  async create(creatorId: string, dto: CreateFixedTaskDto) {
    await this.validateCreation(creatorId, dto);
    const templateId = new Types.ObjectId();
    const startDate = this.parseOptionalDate(dto.startDate, 'startDate');
    const endDate = this.parseOptionalDate(dto.endDate, 'endDate');
    this.policy.assertValidDateRange(startDate, endDate);

    await this.repository.create({
      _id: templateId,
      title: dto.title,
      assignedTo: new Types.ObjectId(dto.assignedTo),
      createdBy: new Types.ObjectId(creatorId),
      recurrence: dto.recurrence,
      status: FixedTaskStatus.TODO,
      description: dto.description ?? '',
      taskComment: dto.taskComment ?? null,
      scheduleConfig: dto.scheduleConfig,
      isActive: dto.isActive ?? true,
      nextRunAt: dto.nextRunAt
        ? new Date(dto.nextRunAt)
        : this.deadlineService.getNextDeadline(dto.recurrence, dto.endTime),
      startTime: dto.startTime,
      endTime: dto.endTime,
      startDate,
      endDate,
      sourceExcel: `manual:${templateId.toString()}`,
      sourceSheet: 'manual',
      sourceRow: 0,
    });

    this.notificationService.notifyAssigned(
      dto.assignedTo,
      templateId.toString(),
      dto.title,
    );
    return this.queryService.findById(templateId.toString());
  }

  private async validateCreation(
    creatorId: string,
    dto: CreateFixedTaskDto,
  ): Promise<void> {
    this.policy.toObjectId(creatorId, 'creator user ID');
    this.policy.toObjectId(dto.assignedTo, 'assigned user ID');
    await this.policy.validateParticipants(creatorId, dto.assignedTo);

    if (dto.status !== undefined && dto.status !== FixedTaskStatus.TODO) {
      throw new BadRequestException(
        'A fixed task must be created with todo status',
      );
    }
  }

  private parseOptionalDate(value: string | undefined, label: string) {
    return value ? this.policy.parseDate(value, label) : undefined;
  }
}
