import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../fixed-task.schema';

export interface FixedTaskRolloverSchedule {
  startDate: Date;
  startTime: string | null;
  endDate: Date;
  endTime: string | null;
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

  findDailyRolloverCandidates() {
    return this.model
      .find({
        recurrence: FixedTaskRecurrence.DAILY,
        $or: [
          { isActive: true },
          { 'scheduleConfig.weekdays.0': { $exists: true } },
        ],
      })
      .sort({ createdAt: -1, _id: -1 })
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
    const timingApproved =
      previous.timingApprovalStatus ===
      FixedTaskTimingApprovalStatus.APPROVED;

    return new this.model({
      _id: occurrenceId,
      title: previous.title,
      assignedTo: previous.assignedTo,
      createdBy: previous.createdBy,
      recurrence: previous.recurrence as FixedTaskRecurrence,
      description: previous.description,
      scheduleConfig: previous.scheduleConfig,
      isActive: true,
      status: FixedTaskStatus.TODO,
      startedAt: null,
      doneTime: null,
      actualDurationMinutes: null,
      approvedDurationMinutes: timingApproved
        ? previous.approvedDurationMinutes
        : null,
      timingApprovalStatus: timingApproved
        ? FixedTaskTimingApprovalStatus.APPROVED
        : FixedTaskTimingApprovalStatus.PENDING,
      timingApprovedBy: timingApproved ? previous.timingApprovedBy : null,
      timingApprovedAt: timingApproved ? previous.timingApprovedAt : null,
      scoreAdjusted: false,
      startDate: schedule.startDate,
      startTime: timingApproved ? (previous.startTime ?? null) : null,
      endDate: schedule.endDate,
      endTime: timingApproved ? (previous.endTime ?? null) : null,
      sourceExcel: previous.sourceExcel,
      sourceSheet: previous.sourceSheet,
      sourceRow: occurrenceSourceRow,
      originalSourceRow: previous.originalSourceRow ?? previous.sourceRow,
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
      .populate('createdBy', 'firstName lastName email roles workField')
      .populate('timingApprovedBy', 'firstName lastName email roles');
  }
}
