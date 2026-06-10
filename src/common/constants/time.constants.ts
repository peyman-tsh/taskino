export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const TIME_MESSAGE = 'must use 24-hour HH:mm format';

export function isValidTimeRange(
  startTime?: string,
  endTime?: string,
): boolean {
  if (!startTime || !endTime) return true;
  return endTime > startTime;
}
