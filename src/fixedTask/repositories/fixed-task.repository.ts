import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
  FixedTaskStatus,
} from '../fixed-task.schema';

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
          .sort({ createdAt: -1 })
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
        { new: true },
      )
      .exec();
  }

  findUnadjustedWithDeadline(now: Date) {
    return this.model
      .find({
        status: { $ne: FixedTaskStatus.DONE },
        nextRunAt: { $lt: now },
        scoreAdjusted: { $ne: true },
      })
      .exec();
  }

  deleteById(id: Types.ObjectId) {
    return this.model.findByIdAndDelete(id).exec();
  }

  findActive() {
    return this.populate(this.model.find({ isActive: true })).exec();
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
