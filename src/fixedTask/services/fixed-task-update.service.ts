import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UpdateFixedTaskDto } from '../dto/update-fixed-task.dto';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import {
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskScoreService } from './fixed-task-score.service';

@Injectable()
export class FixedTaskUpdateService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
    private readonly scoreService: FixedTaskScoreService,
    private readonly notificationService: FixedTaskNotificationService,
    private readonly queryService: FixedTaskQueryService,
  ) {}

  async update(id: string, requesterId: string, dto: UpdateFixedTaskDto) {
    const requesterObjectId = this.policy.toObjectId(
      requesterId,
      'requester user ID',
    );
    const template = await this.repository.findRawById(
      this.policy.toObjectId(id, 'fixed task ID'),
    );
    if (!template) {
      throw new NotFoundException('Fixed task template not found');
    }

    const isAssignee =
      template.assignedTo.toString() === requesterObjectId.toString();
    await this.validateUpdate(template, requesterObjectId.toString(), dto, isAssignee);

    const updatedTemplate = await this.repository.updateById(
      template._id,
      this.buildUpdateData(template, dto),
    );
    if (!updatedTemplate) {
      throw new NotFoundException('Fixed task template not found');
    }

    await this.runCompletionActions(template, updatedTemplate, dto, isAssignee);
    return this.queryService.findById(updatedTemplate._id.toString());
  }

  private async validateUpdate(
    template: FixedTaskTemplateDocument,
    requesterId: string,
    dto: UpdateFixedTaskDto,
    isAssignee: boolean,
  ): Promise<void> {
    if (isAssignee) {
      this.assertAssigneeStatusOnlyUpdate(dto);
      return;
    }
    if (dto.status !== undefined) {
      throw new ForbiddenException(
        'Only the fixed task assignee can update the status',
      );
    }

    const assignedTo = dto.assignedTo ?? template.assignedTo.toString();
    await this.policy.validateParticipants(requesterId, assignedTo);
    const startDate = this.resolveDate(dto.startDate, template.startDate, 'startDate');
    const endDate = this.resolveDate(dto.endDate, template.endDate, 'endDate');
    this.policy.assertValidDateRange(startDate, endDate);
  }

  private buildUpdateData(
    template: FixedTaskTemplateDocument,
    dto: UpdateFixedTaskDto,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.assignedTo !== undefined) {
      updateData.assignedTo = new Types.ObjectId(dto.assignedTo);
    }
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      updateData.doneTime =
        dto.status === FixedTaskStatus.DONE
          ? (template.doneTime ?? new Date())
          : null;
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.nextRunAt !== undefined) updateData.nextRunAt = new Date(dto.nextRunAt);
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime;
    if (dto.startDate !== undefined) {
      updateData.startDate = this.policy.parseDate(dto.startDate, 'startDate');
    }
    if (dto.endDate !== undefined) {
      updateData.endDate = this.policy.parseDate(dto.endDate, 'endDate');
    }
    return updateData;
  }

  private async runCompletionActions(
    previousTemplate: FixedTaskTemplateDocument,
    updatedTemplate: FixedTaskTemplateDocument,
    dto: UpdateFixedTaskDto,
    isAssignee: boolean,
  ): Promise<void> {
    if (dto.status !== FixedTaskStatus.DONE || !isAssignee) return;

    await this.scoreService.adjustTaskScore(updatedTemplate);
    this.notificationService.notifyCreatorWhenCompleted(
      previousTemplate.createdBy.toString(),
      updatedTemplate._id.toString(),
      updatedTemplate.title,
    );
  }

  private resolveDate(
    value: string | undefined,
    currentValue: Date | undefined,
    label: string,
  ): Date | undefined {
    return value !== undefined ? this.policy.parseDate(value, label) : currentValue;
  }

  private assertAssigneeStatusOnlyUpdate(dto: UpdateFixedTaskDto): void {
    const fields = Object.keys(dto);
    if (dto.status === undefined || fields.some((field) => field !== 'status')) {
      throw new ForbiddenException(
        'Fixed task assignee can only update the status',
      );
    }
  }
}
