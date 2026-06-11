import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Leave, LeaveDocument } from '../LeaveRequest.schema';

@Injectable()
export class LeaveRequestRepository {
  constructor(
    @InjectModel(Leave.name)
    private readonly model: Model<LeaveDocument>,
  ) {}

  create(data: Record<string, unknown>) {
    return new this.model(data).save();
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
          .limit(limit)
          .sort({ startDate: -1 }),
      ).exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  findById(id: string) {
    return this.populate(this.model.findById(id)).exec();
  }

  findRawById(id: string) {
    return this.model.findById(id).exec();
  }

  exists(id: string) {
    return this.model.exists({ _id: id }).exec();
  }

  updateById(id: string, update: Record<string, unknown>) {
    return this.populate(
      this.model.findByIdAndUpdate(id, update, { new: true }),
    ).exec();
  }

  deleteById(id: string) {
    return this.model.findByIdAndDelete(id).exec();
  }

  private populate(query: any) {
    return query
      .populate('user', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email');
  }
}
