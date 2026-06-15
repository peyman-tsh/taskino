import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { isValidTimeRange } from '../../common/constants/time.constants';

@Injectable()
export class LeaveRequestPolicyService {
  isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  parseDate(value: Date | string, label: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label} format`);
    }
    return date;
  }

  assertValidDateRange(startDate?: Date, endDate?: Date): void {
    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }
  }

  assertValidTimeRange(startTime?: string, endTime?: string): void {
    if (!isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('End time must be after start time');
    }
  }
}
