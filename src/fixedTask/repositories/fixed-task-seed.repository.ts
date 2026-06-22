import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { FixedTaskRecurrence } from '../fixed-task.schema';
import { FixedTaskTimingApprovalStatus } from '../fixed-task.schema';
import { UserRole } from '../../user/schemas/user.schema';
import { WorkField } from '../../common/enums/work-field.enum';

export interface SeedUserData {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: UserRole;
}

export interface SeedFixedTaskData {
  title: string;
  recurrence: FixedTaskRecurrence;
  description: string;
  nextRunAt: Date;
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
  sourceExcel: string;
  sourceSheet: string;
  sourceRow: number;
}

@Injectable()
export class FixedTaskSeedRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async upsertUser(user: SeedUserData, password: string) {
    return this.connection.collection('users').findOneAndUpdate(
      { mobile: user.mobile },
      {
        $set: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobile: user.mobile,
          password,
          roles: user.role,
          workField: WorkField.OPERATIONS,
          isActive: true,
        },
        $setOnInsert: {
          score: 0,
          progressPercentage: 0,
          performanceStatus: 'weak',
          createdAt: new Date(),
        },
        $currentDate: { updatedAt: true },
      },
      { upsert: true, returnDocument: 'after' },
    );
  }

  async insertFixedTask(
    data: SeedFixedTaskData,
    creatorId: unknown,
    assigneeId: unknown,
  ): Promise<void> {
    const now = new Date();
    const fixedTaskId = new Types.ObjectId();
    const uniqueSourceRow = -Number.parseInt(
      fixedTaskId.toHexString().slice(-12),
      16,
    );

    await this.connection.collection('fixedtasktemplates').insertOne({
      _id: fixedTaskId,
      title: data.title,
      createdBy: creatorId,
      assignedTo: assigneeId,
      recurrence: data.recurrence,
      description: data.description,
      nextRunAt: data.nextRunAt,
      startDate: data.startDate,
      startTime: data.startTime,
      endDate: data.endDate,
      endTime: data.endTime,
      isActive: true,
      status: 'todo',
      startedAt: null,
      doneTime: null,
      actualDurationMinutes: null,
      approvedDurationMinutes: null,
      timingApprovalStatus: FixedTaskTimingApprovalStatus.PENDING,
      timingApprovedBy: null,
      timingApprovedAt: null,
      scoreAdjusted: false,
      sourceExcel: data.sourceExcel,
      sourceSheet: data.sourceSheet,
      sourceRow: uniqueSourceRow,
      originalSourceRow: data.sourceRow,
      createdAt: now,
      updatedAt: now,
    });
  }
}
