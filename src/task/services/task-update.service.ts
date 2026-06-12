import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskRepository } from '../repositories/task.repository';
import { TaskDocument, TaskStatus } from '../task.schema';
import { TaskNotificationService } from './task-notification.service';
import { TaskPolicyService } from './task-policy.service';
import { TaskScoreService } from './task-score.service';

interface UpdateContext {
  updateData: Record<string, unknown>;
  newlyAssignedUserIds: string[];
  changedToDone: boolean;
  statusChanged: boolean;
}

@Injectable()
export class TaskUpdateService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly policy: TaskPolicyService,
    private readonly notificationService: TaskNotificationService,
    private readonly scoreService: TaskScoreService,
  ) {}

  async update(id: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    this.policy.validateObjectId(id);
    const task = await this.findExistingTask(id);
    const context = await this.buildUpdateContext(task, dto);
    const updatedTask = await this.repository.updateById(id, context.updateData);

    if (!updatedTask) {
      throw new NotFoundException('Task not found');
    }

    await this.runPostUpdateActions(task, updatedTask, context);
    return updatedTask;
  }

  private async findExistingTask(id: string): Promise<TaskDocument> {
    const task = await this.repository.findRawById(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  private async buildUpdateContext(
    task: TaskDocument,
    dto: UpdateTaskDto,
  ): Promise<UpdateContext> {
    const updateData = this.definedFields(dto);
    this.applyDatesAndValidateRange(task, dto, updateData);
    await this.applyAssignee(task, dto, updateData);
    const changedToDone = this.applyCompletionState(task, dto, updateData);

    return {
      updateData,
      changedToDone,
      statusChanged:
        dto.status !== undefined && dto.status !== task.status,
      newlyAssignedUserIds: this.getNewAssigneeIds(task, dto),
    };
  }

  private definedFields(dto: UpdateTaskDto): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
  }

  private applyDatesAndValidateRange(
    task: TaskDocument,
    dto: UpdateTaskDto,
    updateData: Record<string, unknown>,
  ): void {
    const startDate =
      dto.startDate !== undefined
        ? this.policy.parseDateTime(dto.startDate, 'startDate')
        : task.startDate;
    const dueDate =
      dto.dueDate !== undefined
        ? this.policy.parseDateTime(dto.dueDate, 'dueDate')
        : task.dueDate;

    this.policy.assertValidDeadline(startDate, dueDate);
    this.policy.assertValidTimeRange(
      dto.startTime ?? task.startTime,
      dto.endTime ?? task.endTime,
    );

    if (dto.startDate !== undefined) {
      updateData.startDate = startDate;
    }
    if (dto.dueDate !== undefined) {
      updateData.dueDate = dueDate;
    }
  }

  private async applyAssignee(
    task: TaskDocument,
    dto: UpdateTaskDto,
    updateData: Record<string, unknown>,
  ): Promise<void> {
    if (dto.assignedTo === undefined) {
      return;
    }

    this.policy.assertSingleAssignee(dto.assignedTo);
    this.policy.assertValidAssigneeIds(dto.assignedTo);
    await this.policy.assertParticipants(
      task.createdBy.toString(),
      dto.assignedTo,
    );
    updateData.assignedTo = dto.assignedTo.map(
      (userId) => new Types.ObjectId(userId),
    );
  }

  private applyCompletionState(
    task: TaskDocument,
    dto: UpdateTaskDto,
    updateData: Record<string, unknown>,
  ): boolean {
    const changedToDone =
      dto.status === TaskStatus.DONE && task.status !== TaskStatus.DONE;

    if (changedToDone) {
      updateData.doneTime = new Date();
    } else if (dto.status !== undefined && dto.status !== TaskStatus.DONE) {
      updateData.doneTime = null;
    }

    return changedToDone;
  }

  private getNewAssigneeIds(task: TaskDocument, dto: UpdateTaskDto): string[] {
    const previousAssigneeIds = task.assignedTo.map((userId) =>
      userId.toString(),
    );
    return (
      dto.assignedTo?.filter(
        (userId) => !previousAssigneeIds.includes(userId),
      ) ?? []
    );
  }

  private async runPostUpdateActions(
    previousTask: TaskDocument,
    updatedTask: TaskDocument,
    context: UpdateContext,
  ): Promise<void> {
    this.notificationService.notifyAssignedUsers(
      context.newlyAssignedUserIds,
      updatedTask._id.toString(),
      updatedTask.title,
    );

    if (context.statusChanged) {
      this.notificationService.notifyStatusChanged(
        updatedTask._id.toString(),
        updatedTask.title,
        updatedTask.status,
      );
    }

    if (!context.changedToDone) {
      return;
    }

    await this.scoreService.adjustCompletedTaskScore(updatedTask);
    this.notificationService.notifyCreatorWhenCompleted(
      previousTask.createdBy.toString(),
      updatedTask._id.toString(),
      updatedTask.title,
    );
  }
}
