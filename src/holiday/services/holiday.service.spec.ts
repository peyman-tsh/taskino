import { HolidayRepository } from '../repositories/holiday.repository';
import { HolidayService } from './holiday.service';

describe('HolidayService', () => {
  const repository = {
    existsByDate: jest.fn(),
    upsertMany: jest.fn(),
    findByYear: jest.fn(),
  };
  const service = new HolidayService(
    repository as unknown as HolidayRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects Iran official holidays from the seed list when database is empty', async () => {
    repository.existsByDate.mockResolvedValue(null);

    await expect(
      service.isOfficialHoliday(new Date('2026-06-23T20:31:00.000Z')),
    ).resolves.toBe(true);
  });

  it('detects Fridays in Tehran as non-working days', async () => {
    repository.existsByDate.mockResolvedValue(null);

    await expect(
      service.isNonWorkingDay(new Date('2026-06-25T20:31:00.000Z')),
    ).resolves.toBe(true);
  });
});
