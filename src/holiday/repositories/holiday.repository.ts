import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Holiday, HolidayDocument } from '../holiday.schema';

@Injectable()
export class HolidayRepository {
  constructor(
    @InjectModel(Holiday.name)
    private readonly model: Model<HolidayDocument>,
  ) {}

  async upsertMany(
    holidays: Array<{
      date: Date;
      title: string;
      jalaliDate: string;
      jalaliYear: number;
      isOfficial: boolean;
      source: string;
    }>,
  ) {
    if (holidays.length === 0) {
      return { insertedOrUpdated: 0 };
    }

    const result = await this.model.bulkWrite(
      holidays.map((holiday) => ({
        updateOne: {
          filter: { date: holiday.date },
          update: { $set: holiday },
          upsert: true,
        },
      })),
    );

    return {
      insertedOrUpdated:
        result.upsertedCount + result.modifiedCount + result.matchedCount,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount,
    };
  }

  findByYear(jalaliYear: number) {
    return this.model
      .find({ jalaliYear, isOfficial: true })
      .sort({ date: 1 })
      .exec();
  }

  existsByDate(date: Date) {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    return this.model
      .exists({
        isOfficial: true,
        date: { $gte: dayStart, $lte: dayEnd },
      })
      .exec();
  }
}
