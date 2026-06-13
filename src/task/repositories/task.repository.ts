import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Model,
  PipelineStage,
  Query,
  QueryFilter,
  Types,
  UpdateQuery,
} from 'mongoose';
import { Task, TaskDocument, TaskStatus } from '../task.schema';

export type TaskFilter = QueryFilter<Task>;
export type TaskUpdate = UpdateQuery<TaskDocument>;
export type TaskCreateData = Partial<Task> & { _id?: Types.ObjectId };

@Injectable()
export class TaskRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly model: Model<TaskDocument>,
  ) {}

  create(data: TaskCreateData): Promise<TaskDocument> {
    return new this.model(data).save();
  }

  find(filter: TaskFilter): Promise<TaskDocument[]> {
    return this.model.find(filter).exec();
  }

  findRawById(id: string): Promise<TaskDocument | null> {
    return this.model.findById(id).exec();
  }

  findById(id: string): Promise<TaskDocument | null> {
    return this.populate(this.model.findById(id)).exec();
  }

  async findPaginated(
    filter: TaskFilter,
    page: number,
    limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.populate(
        this.model
          .find(filter)
          .skip((page - 1) * limit)
          .limit(limit),
      ).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  updateById(id: string | Types.ObjectId, update: TaskUpdate) {
    return this.populate(
      this.model.findByIdAndUpdate(id, update, { new: true }),
    ).exec();
  }

  deleteById(id: string) {
    return this.model.findByIdAndDelete(id).exec();
  }

  updateMany(filter: TaskFilter, update: TaskUpdate) {
    return this.model.updateMany(filter, update).exec();
  }

  claimScoreAdjustment(id: Types.ObjectId, session?: ClientSession) {
    return this.model
      .findOneAndUpdate(
        { _id: id, scoreAdjusted: { $ne: true } },
        { $set: { scoreAdjusted: true } },
        { new: true, session },
      )
      .exec();
  }

  releaseScoreAdjustment(id: Types.ObjectId) {
    return this.model
      .updateOne({ _id: id }, { $set: { scoreAdjusted: false } })
      .exec();
  }

  findUnadjustedIncomplete(): Promise<TaskDocument[]> {
    return this.model
      .find({
        status: { $ne: TaskStatus.DONE },
        dueDate: { $type: 'date' },
        scoreAdjusted: { $ne: true },
      })
      .exec();
  }

  count(filter: TaskFilter): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  aggregate<T>(pipeline: PipelineStage[]) {
    return this.model.aggregate<T>(pipeline).exec();
  }

  private populate<TResult>(
    query: Query<TResult, TaskDocument>,
  ): Query<TResult, TaskDocument> {
    return query
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate(
        'excelFile',
        'fileName originalName mimeType fileSize type status',
      );
  }
}
