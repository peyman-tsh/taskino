import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ExcelFile, ExcelType } from '../../excel/excel.schema';
import { ExcelService } from '../../excel/services/excel.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import {
  TaskCreateData,
  TaskRepository,
} from '../repositories/task.repository';
import { TaskDocument, TaskStatus } from '../task.schema';
import { TaskNotificationService } from './task-notification.service';
import { TaskPolicyService } from './task-policy.service';
import { TaskScoreService } from './task-score.service';

const EXCEL_IMPORT_TYPE = 'import' as ExcelType;

export type TaskCreationResult =
  | TaskDocument
  | {
      task: TaskDocument;
      excelUpload: ExcelFile;
    };

@Injectable()
export class TaskCreationService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly excelService: ExcelService,
    private readonly policy: TaskPolicyService,
    private readonly notificationService: TaskNotificationService,
    private readonly scoreService: TaskScoreService,
  ) {}

  async create(
    dto: CreateTaskDto,
    file?: Express.Multer.File,
  ): Promise<TaskCreationResult> {
    const assignedTo = await this.validateParticipants(dto);
    const taskData = this.buildTaskData(dto, assignedTo);
    const excelUpload = file
      ? await this.uploadExcel(file, dto.createdBy, taskData)
      : undefined;
    const task = await this.repository.create(taskData);

    await this.runPostCreationActions(task, assignedTo);

    return excelUpload ? { task, excelUpload } : task;
  }

  private async validateParticipants(dto: CreateTaskDto): Promise<string[]> {
    this.policy.validateObjectId(dto.createdBy);
    const assignedTo = this.policy.normalizeAssignedTo(dto.assignedTo);
    this.policy.assertSingleAssignee(assignedTo);
    this.policy.assertValidAssigneeIds(assignedTo);
    await this.policy.assertParticipants(dto.createdBy, assignedTo);
    return assignedTo;
  }

  private buildTaskData(
    dto: CreateTaskDto,
    assignedTo: string[],
  ): TaskCreateData {
    const {
      createdBy,
      assignedTo: _assignedTo,
      startDate,
      dueDate,
      startTime,
      endTime,
      ...rest
    } = dto;
    const parsedStartDate = startDate
      ? this.policy.parseDateTime(startDate, 'startDate')
      : undefined;
    const parsedDueDate = dueDate
      ? this.policy.parseDateTime(dueDate, 'dueDate')
      : undefined;

    this.policy.assertValidDeadline(parsedStartDate, parsedDueDate);
    this.policy.assertValidTimeRange(startTime, endTime);

    return {
      _id: new Types.ObjectId(),
      ...rest,
      createdBy: new Types.ObjectId(createdBy),
      assignedTo: assignedTo.map((userId) => new Types.ObjectId(userId)),
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      startTime,
      endTime,
      doneTime: rest.status === TaskStatus.DONE ? new Date() : undefined,
    };
  }

  private async uploadExcel(
    file: Express.Multer.File,
    createdBy: string,
    taskData: TaskCreateData,
  ): Promise<ExcelFile> {
    const excelUpload = await this.excelService.uploadFile(
      file,
      createdBy,
      EXCEL_IMPORT_TYPE,
    );
    taskData.file = excelUpload.fileName;
    taskData.excelFile = new Types.ObjectId(excelUpload._id.toString());
    return excelUpload;
  }

  private async runPostCreationActions(
    task: TaskDocument,
    assignedTo: string[],
  ): Promise<void> {
    if (task.status === TaskStatus.DONE) {
      await this.scoreService.adjustCompletedTaskScore(task);
    }
    this.notificationService.notifyAssignedUsers(
      assignedTo,
      task._id.toString(),
      task.title,
    );
  }
}
