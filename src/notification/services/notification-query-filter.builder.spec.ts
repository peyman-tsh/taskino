import { Types } from 'mongoose';
import { NotificationQueryFilterBuilder } from './notification-query-filter.builder';
import { NotificationPolicyService } from './notification-policy.service';

describe('NotificationQueryFilterBuilder', () => {
  const policy = {
    toObjectId: jest.fn((id: string) => new Types.ObjectId(id)),
    escapeRegex: jest.fn((value: string) => value),
  };
  const builder = new NotificationQueryFilterBuilder(
    policy as unknown as NotificationPolicyService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters notifications by created date range', () => {
    const userId = new Types.ObjectId();
    const from = '2026-07-01T00:00:00.000Z';
    const to = '2026-07-06T23:59:59.999Z';

    const query = builder.build(userId, { from, to } as never);

    expect(query).toEqual({
      user: userId,
      createdAt: {
        $gte: new Date(from),
        $lte: new Date(to),
      },
    });
  });
});
