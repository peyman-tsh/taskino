import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { FixedTaskRecurrence } from '../fixed-task.schema';
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
  startTime: string;
  endDate: Date;
  endTime: string;
  sourceExcel: string;
  sourceSheet: string;
  sourceRow: number;
}

@Injectable()
export class FixedTaskSeedRepository {
  private sourceIndexReady?: Promise<void>;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async upsertUser(user: SeedUserData, password: string) {
    return this.connection.collection('users').findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          firstName: user.firstName,
          lastName: user.lastName,
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
    await this.ensureSourceIndexAllowsDuplicates();
    const now = new Date();

    await this.connection.collection('fixedtasktemplates').insertOne({
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
      scoreAdjusted: false,
      sourceExcel: data.sourceExcel,
      sourceSheet: data.sourceSheet,
      sourceRow: data.sourceRow,
      createdAt: now,
      updatedAt: now,
    });
  }

  private ensureSourceIndexAllowsDuplicates(): Promise<void> {
    this.sourceIndexReady ??= this.replaceUniqueSourceIndex();
    return this.sourceIndexReady;
  }

  private async replaceUniqueSourceIndex(): Promise<void> {
    const collection = this.connection.collection('fixedtasktemplates');
    const indexName = 'sourceExcel_1_sourceSheet_1_sourceRow_1';
    const indexes = await collection.indexes();
    const sourceIndex = indexes.find((index) => index.name === indexName);

    if (sourceIndex?.unique) {
      await collection.dropIndex(indexName);
    }

    if (!sourceIndex || sourceIndex.unique) {
      await collection.createIndex(
        { sourceExcel: 1, sourceSheet: 1, sourceRow: 1 },
        { name: indexName },
      );
    }
  }
}
