import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UpdateFixedTaskDto } from '../dto/update-fixed-task.dto';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import {
  FixedTaskStatus,
  FixedTaskTemplateDocument,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';
import { FixedTaskNotificationService } from './fixed-task-notification.service';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { FixedTaskScheduleService } from './fixed-task-schedule.service';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import {
  UserProgressEvents,
  UserProgressRefreshRequestedEvent,
} from '../../common/events/user-progress.events';

@Injectable()
export class FixedTaskUpdateService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
    private readonly scoreService: FixedTaskScoreService,
    private readonly notificationService: FixedTaskNotificationService,
    private readonly queryService: FixedTaskQueryService,
    private readonly eventBus: InternalEventBus,
    private readonly scheduleService: FixedTaskScheduleService,
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

    const updateData = this.buildUpdateData(template, dto, requesterObjectId);
    Object.assign(updateData, this.buildScheduleConfigUpdateData(template, dto));

    const updatedTemplate = await this.repository.updateById(
      template._id,
      updateData,
    );
    if (!updatedTemplate) {
      throw new NotFoundException('Fixed task template not found');
    }

    await this.runCompletionActions(template, updatedTemplate, dto, isAssignee);
    this.publishProgressRefresh(template, updatedTemplate, dto);
    return this.queryService.findById(updatedTemplate._id.toString());
  }

  private async validateUpdate(
    template: FixedTaskTemplateDocument,
    requesterId: string,
    dto: UpdateFixedTaskDto,
    isAssignee: boolean,
  ): Promise<void> {
    if (dto.status !== undefined) {
      this.assertStatusUpdateAllowed(isAssignee);
    }

    const assignedTo = dto.assignedTo ?? template.assignedTo.toString();
    if (!isAssignee) {
      await this.policy.validateParticipants(requesterId, assignedTo);
    }
    const startDate = this.resolveDate(dto.startDate, template.startDate, 'startDate');
    const endDate = this.resolveDate(dto.endDate, template.endDate, 'endDate');
    this.policy.assertValidDateRange(startDate, endDate);
  }

  private buildUpdateData(
    template: FixedTaskTemplateDocument,
    dto: UpdateFixedTaskDto,
    requesterObjectId: Types.ObjectId,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.assignedTo !== undefined) {
      updateData.assignedTo = new Types.ObjectId(dto.assignedTo);
    }
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === FixedTaskStatus.DONE) {
        const doneTime = template.doneTime ?? new Date();
        updateData.doneTime = doneTime;
        updateData.actualDurationMinutes =
          dto.actualDurationMinutes ??
          this.calculateActualDurationMinutes(template, doneTime);
      } else {
        updateData.doneTime = null;
        updateData.actualDurationMinutes = null;
      }
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.taskComment !== undefined) {
      updateData.taskComment = dto.taskComment;
    }
    if (dto.scheduleConfig !== undefined) {
      updateData.scheduleConfig = dto.scheduleConfig;
    }
    if (dto.actualDurationMinutes !== undefined && dto.status === undefined) {
      updateData.actualDurationMinutes = dto.actualDurationMinutes;
    }
    if (dto.approvedDurationMinutes !== undefined) {
      updateData.approvedDurationMinutes = dto.approvedDurationMinutes;
      updateData.timingApprovalStatus =
        FixedTaskTimingApprovalStatus.APPROVED;
      updateData.timingApprovedBy = requesterObjectId;
      updateData.timingApprovedAt = new Date();
    }
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

  private buildScheduleConfigUpdateData(
    template: FixedTaskTemplateDocument,
    dto: UpdateFixedTaskDto,
  ): Record<string, unknown> {
    if (dto.scheduleConfig === undefined) return {};

    const shouldBeActive = dto.isActive ?? template.isActive;
    if (!shouldBeActive) return {};

    const candidate = {
      ...this.toPlainFixedTask(template),
      recurrence: dto.recurrence ?? template.recurrence,
      scheduleConfig: dto.scheduleConfig,
      isActive: shouldBeActive,
    } as FixedTaskTemplateDocument;

    if (!this.scheduleService.hasScheduleConfig(candidate)) return {};

    const now = new Date();
    if (!this.scheduleService.shouldGenerateToday(candidate, now)) {
      return { isActive: false };
    }

    const schedule = this.scheduleService.buildRolloverSchedule(candidate, now);
    const scheduleUpdate: Record<string, unknown> = {
      isActive: true,
    };

    if (dto.startDate === undefined) {
      scheduleUpdate.startDate = schedule.startDate;
    }

    if (dto.endDate === undefined) {
      scheduleUpdate.endDate = schedule.endDate;
    }

    return scheduleUpdate;
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

  private assertStatusUpdateAllowed(isAssignee: boolean): void {
    if (!isAssignee) {
      throw new ForbiddenException(
        'Only the fixed task assignee can update the status',
      );
    }
  }

  private calculateActualDurationMinutes(
    template: FixedTaskTemplateDocument,
    doneTime: Date,
  ): number | null {
    if (!template.startedAt) return null;

    return Math.max(
      1,
      Math.ceil(
        (doneTime.getTime() - template.startedAt.getTime()) / 60_000,
      ),
    );
  }

  private publishProgressRefresh(
    previousTemplate: FixedTaskTemplateDocument,
    updatedTemplate: FixedTaskTemplateDocument,
    dto: UpdateFixedTaskDto,
  ): void {
    if (dto.status === undefined && dto.assignedTo === undefined) return;

    const userIds = [
      ...new Set([
        previousTemplate.assignedTo.toString(),
        updatedTemplate.assignedTo.toString(),
      ]),
    ];
    this.eventBus.publish(
      UserProgressEvents.REFRESH_REQUESTED,
      new UserProgressRefreshRequestedEvent(userIds),
    );
  }

  private toPlainFixedTask(
    template: FixedTaskTemplateDocument,
  ): Record<string, unknown> {
    return typeof template.toObject === 'function'
      ? (template.toObject() as unknown as Record<string, unknown>)
      : (template as unknown as Record<string, unknown>);
  }
}
