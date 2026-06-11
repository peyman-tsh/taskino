import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Task, TaskDocument } from '../task.schema';

@Injectable()
export class TaskRepository {
  constructor(
    @InjectModel(Task.name)
    private readonly model: Model<TaskDocument>,
  ) {}

  create(data: Record<string, unknown>) {
    return new this.model(data).save();
  }

  find(filter: Record<string, unknown>) {
    return this.model.find(filter).exec();
  }

  findRawById(id: string) {
    return this.model.findById(id).exec();
  }

  findById(id: string) {
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
          .skip((page - 1) * limit)
          .limit(limit),
      ).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  updateById(id: string | Types.ObjectId, update: Record<string, unknown>) {
    return this.populate(
      this.model.findByIdAndUpdate(id, update, { new: true }),
    ).exec();
  }

  deleteById(id: string) {
    return this.model.findByIdAndDelete(id).exec();
  }

  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>) {
    return this.model.updateMany(filter, update).exec();
  }

  count(filter: Record<string, unknown>) {
    return this.model.countDocuments(filter).exec();
  }

  aggregate<T>(pipeline: PipelineStage[]) {
    return this.model.aggregate<T>(pipeline).exec();
  }

  private populate(query: any) {
    return query
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate(
        'excelFile',
        'fileName originalName mimeType fileSize type status',
      );
  }
}
