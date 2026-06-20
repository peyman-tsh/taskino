import { UserPerformanceStatus } from '../../user/schemas/user.schema';

export function calculatePerformanceStatus(
  progressPercentage: number,
): UserPerformanceStatus {
  if (progressPercentage <= 40) return UserPerformanceStatus.WEAK;
  if (progressPercentage < 70) return UserPerformanceStatus.NORMAL;
  return UserPerformanceStatus.GOOD;
}
