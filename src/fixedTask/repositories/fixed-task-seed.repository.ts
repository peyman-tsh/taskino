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
  sourceExcel: string;
  sourceSheet: string;
  sourceRow: number;
}

@Injectable()
export class FixedTaskSeedRepository {
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

  async upsertFixedTask(
    data: SeedFixedTaskData,
    creatorId: unknown,
    assigneeId: unknown,
  ): Promise<'created' | 'updated'> {
    const result = await this.connection.collection('fixedtasktemplates').updateOne(
      {
        sourceExcel: data.sourceExcel,
        sourceSheet: data.sourceSheet,
        sourceRow: data.sourceRow,
      },
      {
        $set: {
          title: data.title,
          createdBy: creatorId,
          assignedTo: assigneeId,
          recurrence: data.recurrence,
          description: data.description,
          nextRunAt: data.nextRunAt,
          isActive: true,
          sourceExcel: data.sourceExcel,
          sourceSheet: data.sourceSheet,
          sourceRow: data.sourceRow,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          status: 'todo',
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    return result.upsertedCount > 0 ? 'created' : 'updated';
  }
}
