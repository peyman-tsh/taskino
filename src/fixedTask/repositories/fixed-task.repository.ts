import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
  FixedTaskStatus,
} from '../fixed-task.schema';

export interface FixedTaskRolloverSchedule {
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
}

@Injectable()
export class FixedTaskRepository {
  constructor(
    @InjectModel(FixedTaskTemplate.name)
    private readonly model: Model<FixedTaskTemplateDocument>,
  ) {}

  create(data: Record<string, unknown>) {
    return new this.model(data).save();
  }

  findRawById(id: Types.ObjectId) {
    return this.model.findById(id).exec();
  }

  findById(id: Types.ObjectId) {
    return this.populate(this.model.findById(id)).exec();
  }

  async findPaginated(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.populate(
        this.model
          .find(filter)
          .sort({ createdAt: -1, _id: -1  })
          .skip((page - 1) * limit)
          .limit(limit),
      ).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  updateById(id: Types.ObjectId, update: Record<string, unknown>) {
    return this.model
      .findByIdAndUpdate(id, update, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
  }

  claimScoreAdjustment(id: Types.ObjectId) {
    return this.model
      .findOneAndUpdate(
        { _id: id, scoreAdjusted: { $ne: true } },
        { $set: { scoreAdjusted: true } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  findUnadjustedIncomplete() {
    return this.model
      .find({
        status: { $ne: FixedTaskStatus.DONE },
        endDate: { $type: 'date' },
        scoreAdjusted: { $ne: true },
      })
      .exec();
  }

  deleteById(id: Types.ObjectId) {
    return this.model.findByIdAndDelete(id).exec();
  }

  findActive(filter: Record<string, unknown> = { isActive: true }) {
    return this.populate(this.model.find(filter)).exec();
  }

  findActiveRolloverCandidates(
    recurrence: FixedTaskRecurrence,
  ) {
    return this.model
      .find({
        isActive: true,
        recurrence,
      })
      .exec();
  }

  claimExpiredOccurrence(id: Types.ObjectId, generatedAt: Date) {
    return this.model
      .findOneAndUpdate(
        { _id: id, isActive: true },
        {
          $set: {
            isActive: false,
            lastGeneratedAt: generatedAt,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  reactivateOccurrence(id: Types.ObjectId) {
    return this.model
      .updateOne(
        { _id: id },
        {
          $set: { isActive: true },
          $unset: { lastGeneratedAt: 1 },
        },
      )
      .exec();
  }

  createNextOccurrence(
    previous: FixedTaskTemplateDocument,
    schedule: FixedTaskRolloverSchedule,
  ) {
    const occurrenceId = new Types.ObjectId();
    const occurrenceSourceRow = -Number.parseInt(
      occurrenceId.toHexString().slice(-12),
      16,
    );

    return new this.model({
      _id: occurrenceId,
      title: previous.title,
      assignedTo: previous.assignedTo,
      createdBy: previous.createdBy,
      recurrence: previous.recurrence as FixedTaskRecurrence,
      description: previous.description,
      isActive: true,
      status: FixedTaskStatus.TODO,
      doneTime: null,
      scoreAdjusted: false,
      startDate: schedule.startDate,
      startTime: schedule.startTime,
      endDate: schedule.endDate,
      endTime: schedule.endTime,
      sourceExcel: previous.sourceExcel,
      sourceSheet: previous.sourceSheet,
      sourceRow: occurrenceSourceRow,
    }).save();
  }

  count(filter: Record<string, unknown>) {
    return this.model.countDocuments(filter).exec();
  }

  private populate(query: any) {
    return query
      .populate(
        'assignedTo',
        'firstName lastName email mobile roles workField isActive',
      )
      .populate('createdBy', 'firstName lastName email roles workField');
  }
}
