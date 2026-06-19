import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import { calculatePerformanceStatus } from './performance-status.util';

describe('calculatePerformanceStatus', () => {
  it.each([
    [0, UserPerformanceStatus.WEAK],
    [40, UserPerformanceStatus.WEAK],
    [41, UserPerformanceStatus.NORMAL],
    [69, UserPerformanceStatus.NORMAL],
    [70, UserPerformanceStatus.GOOD],
    [75, UserPerformanceStatus.GOOD],
    [100, UserPerformanceStatus.GOOD],
  ])('maps %i percent to %s', (percentage, expectedStatus) => {
    expect(calculatePerformanceStatus(percentage)).toBe(expectedStatus);
  });
});
