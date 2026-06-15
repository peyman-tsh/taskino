import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateFixedTaskDto } from '../dto/create-fixed-task.dto';
import { QueryFixedTaskDto } from '../dto/query-fixed-task.dto';
import { UpdateFixedTaskDto } from '../dto/update-fixed-task.dto';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
} from '../fixed-task.schema';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskScoreService } from './fixed-task-score.service';
import { FixedTaskNotificationService } from './fixed-task-notification.service';

@Injectable()
export class FixedTaskService {
  constructor(
    private readonly repository: FixedTaskRepository,
    private readonly policy: FixedTaskPolicyService,
    private readonly scoreService: FixedTaskScoreService,
    private readonly notificationService: FixedTaskNotificationService,
  ) {}

  async create(creatorId: string, dto: CreateFixedTaskDto) {
    this.policy.toObjectId(creatorId, 'creator user ID');
    this.policy.toObjectId(dto.assignedTo, 'assigned user ID');
    await this.policy.validateParticipants(creatorId, dto.assignedTo);
    const startDate = dto.startDate
      ? this.policy.parseDate(dto.startDate, 'startDate')
      : undefined;
    const endDate = dto.endDate
      ? this.policy.parseDate(dto.endDate, 'endDate')
      : undefined;
    this.policy.assertValidDateRange(startDate, endDate);
    if (dto.status !== undefined && dto.status !== FixedTaskStatus.TODO) {
      throw new BadRequestException(
        'A fixed task must be created with todo status',
      );
    }

    const templateId = new Types.ObjectId();
    await this.repository.create({
      _id: templateId,
      title: dto.title,
      assignedTo: new Types.ObjectId(dto.assignedTo),
      createdBy: new Types.ObjectId(creatorId),
      recurrence: dto.recurrence,
      status: FixedTaskStatus.TODO,
      description: dto.description ?? '',
      isActive: dto.isActive ?? true,
      nextRunAt: dto.nextRunAt
        ? new Date(dto.nextRunAt)
        : this.scoreService.getNextDeadline(dto.recurrence, dto.endTime),
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

    return this.findById(templateId.toString());
  }

  async findAll(queryDto: QueryFixedTaskDto) {
    await this.scoreService.adjustOverdueTasks();
    const query: Record<string, unknown> = {};
    if (queryDto.title) {
      query.title = {
        $regex: queryDto.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }
    if (queryDto.assignedTo) {
      query.assignedTo = this.policy.toObjectId(
        queryDto.assignedTo,
        'assigned user ID',
      );
    }
    if (queryDto.recurrence) {
      if (!Object.values(FixedTaskRecurrence).includes(queryDto.recurrence)) {
        throw new BadRequestException('Invalid fixed task recurrence');
      }
      query.recurrence = queryDto.recurrence;
    }
    if (queryDto.status) query.status = queryDto.status;
    if (queryDto.isActive !== undefined) query.isActive = queryDto.isActive;
    const rangeStart = queryDto.startDate
      ? this.policy.parseDate(queryDto.startDate, 'startDate')
      : undefined;
    const rangeEnd = queryDto.endDate
      ? this.policy.parseDate(queryDto.endDate, 'endDate')
      : undefined;
    this.policy.assertValidDateRange(rangeStart, rangeEnd);
    if (rangeStart) query.endDate = { $gte: rangeStart };
    if (rangeEnd) query.startDate = { $lte: rangeEnd };

    const { data, total } = await this.repository.findPaginated(
      query,
      queryDto.page,
      queryDto.limit,
    );

    return { data, total, page: queryDto.page, limit: queryDto.limit };
  }

  async findById(id: string) {
    const template = await this.repository.findById(
      this.policy.toObjectId(id, 'fixed task ID'),
    );

    if (!template) {
      throw new NotFoundException('Fixed task template not found');
    }

    return template;
  }

  async getStatusCounts() {
    const [totalFixedTasks, todoFixedTasks, inProgressFixedTasks, doneFixedTasks] =
      await Promise.all([
        this.repository.count({}),
        this.repository.count({ status: FixedTaskStatus.TODO }),
        this.repository.count({ status: FixedTaskStatus.IN_PROGRESS }),
        this.repository.count({ status: FixedTaskStatus.DONE }),
      ]);

    return {
      totalFixedTasks,
      todoFixedTasks,
      inProgressFixedTasks,
      doneFixedTasks,
    };
  }

  async update(id: string, requesterId: string, dto: UpdateFixedTaskDto) {
    const normalizedRequesterId = this.policy
      .toObjectId(requesterId, 'requester user ID')
      .toString();
    const template = await this.repository.findRawById(
      this.policy.toObjectId(id, 'fixed task ID'),
    );
    if (!template) {
      throw new NotFoundException('Fixed task template not found');
    }

    const isAssignee =
      template.assignedTo.toString() === normalizedRequesterId;
    if (isAssignee) {
      this.assertAssigneeStatusOnlyUpdate(dto);
    } else {
      if (dto.status !== undefined) {
        throw new ForbiddenException(
          'Only the fixed task assignee can update the status',
        );
      }
      const assignedTo = dto.assignedTo ?? template.assignedTo.toString();
      await this.policy.validateParticipants(normalizedRequesterId, assignedTo);
      const startDate =
        dto.startDate !== undefined
          ? this.policy.parseDate(dto.startDate, 'startDate')
          : template.startDate;
      const endDate =
        dto.endDate !== undefined
          ? this.policy.parseDate(dto.endDate, 'endDate')
          : template.endDate;
      this.policy.assertValidDateRange(startDate, endDate);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.assignedTo !== undefined)
      updateData.assignedTo = new Types.ObjectId(dto.assignedTo);
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
    if (dto.nextRunAt !== undefined) {
      updateData.nextRunAt = new Date(dto.nextRunAt);
    }
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime;
    if (dto.startDate !== undefined) {
      updateData.startDate = this.policy.parseDate(dto.startDate, 'startDate');
    }
    if (dto.endDate !== undefined) {
      updateData.endDate = this.policy.parseDate(dto.endDate, 'endDate');
    }

    const updatedTemplate = await this.repository.updateById(
      template._id,
      updateData,
    );

    if (!updatedTemplate) {
      throw new NotFoundException('Fixed task template not found');
    }

    if (dto.status === FixedTaskStatus.DONE && isAssignee) {
      await this.scoreService.adjustTaskScore(updatedTemplate);
      this.notificationService.notifyCreatorWhenCompleted(
        template.createdBy.toString(),
        updatedTemplate._id.toString(),
        updatedTemplate.title,
      );
    }

    return this.findById(updatedTemplate._id.toString());
  }

  async delete(id: string): Promise<void> {
    const result = await this.repository.deleteById(
      this.policy.toObjectId(id, 'fixed task ID'),
    );

    if (!result) {
      throw new NotFoundException('Fixed task template not found');
    }
  }

  findActiveTemplates() {
    return this.repository.findActive();
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
