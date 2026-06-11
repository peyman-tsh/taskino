import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { Notification, NotificationDocument } from '../notification.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  create(dto: CreateNotificationDto, user: Types.ObjectId) {
    return new this.model({ ...dto, user }).save();
  }

  createBulk(documents: Array<Record<string, unknown>>) {
    return this.model.insertMany(documents) as unknown as Promise<
      NotificationDocument[]
    >;
  }

  findOne(filter: Record<string, unknown>) {
    return this.model.findOne(filter).exec();
  }

  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
  ) {
    return this.model.findOneAndUpdate(filter, update, { new: true }).exec();
  }

  updateMany(filter: Record<string, unknown>, update: Record<string, unknown>) {
    return this.model.updateMany(filter, update).exec();
  }

  findOneAndDelete(filter: Record<string, unknown>) {
    return this.model.findOneAndDelete(filter).exec();
  }

  deleteMany(filter: Record<string, unknown>) {
    return this.model.deleteMany(filter).exec();
  }

  async findPaginated(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
  ) {
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  count(filter: Record<string, unknown>) {
    return this.model.countDocuments(filter).exec();
  }
}
