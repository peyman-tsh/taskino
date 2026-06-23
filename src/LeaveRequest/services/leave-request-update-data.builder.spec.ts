import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  LeaveDocument,
  LeaveRecurrence,
  LeaveStatus,
} from '../LeaveRequest.schema';
import { LeaveRequestPolicyService } from './leave-request-policy.service';
import { LeaveRequestUpdateDataBuilder } from './leave-request-update-data.builder';

describe('LeaveRequestUpdateDataBuilder', () => {
  const policy = new LeaveRequestPolicyService();
  const builder = new LeaveRequestUpdateDataBuilder(policy);

  it('validates an updated start date against the existing end date', () => {
    const leave = {
      _id: new Types.ObjectId(),
      user: new Types.ObjectId(),
      startDate: new Date('2026-06-14T09:00:00.000Z'),
      endDate: new Date('2026-06-14T17:00:00.000Z'),
      recurrence: LeaveRecurrence.DAILY,
      status: LeaveStatus.PENDING,
    } as LeaveDocument;

    expect(() =>
      builder.build(
        { startDate: '2026-06-15T09:00:00.000Z' },
        leave,
      ),
    ).toThrow(BadRequestException);
  });

  it('requires start and end time when leave recurrence is hourly', () => {
    const leave = {
      _id: new Types.ObjectId(),
      user: new Types.ObjectId(),
      startDate: new Date('2026-06-14T09:00:00.000Z'),
      endDate: new Date('2026-06-14T17:00:00.000Z'),
      recurrence: LeaveRecurrence.DAILY,
      status: LeaveStatus.PENDING,
    } as LeaveDocument;

    expect(() =>
      builder.build(
        { recurrence: LeaveRecurrence.HOURLY },
        leave,
      ),
    ).toThrow(BadRequestException);
  });
});
