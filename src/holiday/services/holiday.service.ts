import { Injectable } from '@nestjs/common';
import { IRAN_1405_OFFICIAL_HOLIDAYS } from '../iran-1405-official-holidays';
import { HolidayRepository } from '../repositories/holiday.repository';

@Injectable()
export class HolidayService {
  constructor(private readonly repository: HolidayRepository) {}

  seedIran1405OfficialHolidays() {
    return this.repository.upsertMany(
      IRAN_1405_OFFICIAL_HOLIDAYS.map((holiday) => ({
        date: this.toUtcDate(holiday.date),
        title: holiday.title,
        jalaliDate: holiday.jalaliDate,
        jalaliYear: 1405,
        isOfficial: true,
        source: 'calendar.ut.ac.ir',
      })),
    );
  }

  findIran1405OfficialHolidays() {
    return this.repository.findByYear(1405);
  }

  async isOfficialHoliday(date: Date): Promise<boolean> {
    return Boolean(
      await this.repository.existsByDate(
        this.toUtcDate(this.toTehranDateKey(date)),
      ),
    );
  }

  private toUtcDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toTehranDateKey(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  }
}
