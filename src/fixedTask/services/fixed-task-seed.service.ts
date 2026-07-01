import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { existsSync } from 'fs';
import { basename } from 'path';
import * as XLSX from 'xlsx';
import { FixedTaskRecurrence } from '../fixed-task.schema';
import {
  FixedTaskSeedRepository,
  SeedUserData,
} from '../repositories/fixed-task-seed.repository';
import { UserRole } from '../../user/schemas/user.schema';
import { FixedTaskDeadlineService } from './fixed-task-deadline.service';
import {
  addTehranCalendarPeriod,
  addTehranPersianCalendarMonths,
  formatTehranTime,
  tehranDateTimeToUtc,
  tehranPersianDateTimeToUtc,
} from '../../common/utils/tehran-time.util';

type ExcelRow = Array<string | number | null>;

const PASSWORD = '123456';
const SEED_END_TIME = '00:01';
export const FIXED_TASK_SEED_EXCEL_PATH =
  'C:\\Users\\Zarnegar\\Downloads\\-1408847228164432127_81294547954101.xlsx';

export interface FixedTaskSeedSchedule {
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
}

export interface InitialFixedTaskSeedSchedule {
  startDate: Date;
  startTime: null;
  endDate: Date;
  endTime: null;
}

export function buildFixedTaskSeedSchedule(
  recurrence: FixedTaskRecurrence,
  now = new Date(),
): FixedTaskSeedSchedule {
  const startDate = new Date(now);
  const endDate = calculateSeedEndDate(recurrence, now);

  return {
    startDate,
    startTime: formatTehranTime(now),
    endDate,
    endTime: SEED_END_TIME,
  };
}

export function buildInitialFixedTaskSeedSchedule(
  recurrence: FixedTaskRecurrence,
  now = new Date(),
): InitialFixedTaskSeedSchedule {
  const schedule = buildFixedTaskSeedSchedule(recurrence, now);

  return {
    startDate: schedule.startDate,
    startTime: null,
    endDate: schedule.endDate,
    endTime: null,
  };
}

function calculateSeedEndDate(
  recurrence: FixedTaskRecurrence,
  now: Date,
): Date {
  if (recurrence === FixedTaskRecurrence.MONTHLY) {
    const target = addTehranPersianCalendarMonths(now, 1);
    return tehranPersianDateTimeToUtc(
      target.year,
      target.month,
      target.day,
    );
  }

  const target =
    recurrence === FixedTaskRecurrence.DAILY
      ? addTehranCalendarPeriod(now, 1, 0)
      : addTehranCalendarPeriod(now, 7, 0);

  return tehranDateTimeToUtc(
    target.year,
    target.month,
    target.day,
  );
}

const recurrenceMap: Record<string, FixedTaskRecurrence> = {
  روزانه: FixedTaskRecurrence.DAILY,
  هفتگی: FixedTaskRecurrence.WEEKLY,
  هفتگي: FixedTaskRecurrence.WEEKLY,
  ماهانه: FixedTaskRecurrence.MONTHLY,
};

const manager: SeedUserData = {
  firstName: 'پوریا',
  lastName: 'یاری زاده',
  email: 'Sina.allaee.txt@gmail.com',
  mobile: '09378675840',
  role: UserRole.MANAGER,
};

const sheetUsers: Record<string, SeedUserData> = {
  جلالیان: {
    firstName: 'امیر رضا',
    lastName: 'جلالیان',
    email: 'Sina.allaee.txt@gmail.com',
    mobile: '09223689925',
    role: UserRole.SPECIALIST,
  },
  'امیر گنجی': {
    firstName: 'امیر',
    lastName: 'گنجی',
    email: 'Sina.allaee.txt@gmail.com',
    mobile: '09102425368',
    role: UserRole.SPECIALIST,
  },
  اعلایی: {
    firstName: 'سینا',
    lastName: 'اعلایی',
    email: 'Sina.allaee.txt@gmail.com',
    mobile: '09358776662',
    role: UserRole.SUPERVISOR,
  },
  'اکبر گنجی': {
    firstName: 'اکبر',
    lastName: 'گنجی',
    email: 'Sina.allaee.txt@gmail.com',
    mobile: '09363611863',
    role: UserRole.SPECIALIST,
  },
};

@Injectable()
export class FixedTaskSeedService {
  constructor(
    private readonly repository: FixedTaskSeedRepository,
    private readonly configService: ConfigService,
    private readonly deadlineService: FixedTaskDeadlineService,
  ) {}

  async seed(sourcePath = FIXED_TASK_SEED_EXCEL_PATH) {
    if (!existsSync(sourcePath)) {
      throw new BadRequestException('Excel file path does not exist');
    }

    const password = await bcrypt.hash(
      PASSWORD,
      this.configService.get<number>('app.bcryptSaltRounds') ?? 10,
    );
    const managerUser = await this.repository.upsertUser(manager, password);
    if (!managerUser) {
      throw new Error('Manager seed failed');
    }

    const workbook = XLSX.readFile(sourcePath);
    const unknownSheets = workbook.SheetNames.filter(
      (sheetName) => !sheetUsers[sheetName],
    );
    if (unknownSheets.length > 0) {
      throw new BadRequestException(
        `No user mapping configured for sheets: ${unknownSheets.join(', ')}`,
      );
    }

    let createdTemplates = 0;
    let updatedTemplates = 0;
    const sheets: Array<{
      sheet: string;
      userId: string;
      templates: number;
    }> = [];

    for (const sheetName of workbook.SheetNames) {
      const assignedUser = await this.repository.upsertUser(
        sheetUsers[sheetName],
        password,
      );
      if (!assignedUser) {
        throw new Error(`User seed failed for sheet "${sheetName}"`);
      }

      const rows = this.parseRows(workbook.Sheets[sheetName]);
      for (const { sourceRow, values } of rows) {
        const recurrenceLabel = String(values[6]).trim();
        const recurrence = recurrenceMap[recurrenceLabel];
        if (!recurrence) {
          throw new BadRequestException(
            `Unknown recurrence "${recurrenceLabel}" in sheet "${sheetName}" row ${sourceRow}`,
          );
        }
        const schedule = buildInitialFixedTaskSeedSchedule(recurrence);

        await this.repository.insertFixedTask(
          {
            title: String(values[2]).trim(),
            recurrence,
            description: this.createDescription(values),
            nextRunAt: this.deadlineService.getNextDeadline(recurrence),
            ...schedule,
            sourceExcel: basename(sourcePath),
            sourceSheet: sheetName,
            sourceRow,
          },
          managerUser._id,
          assignedUser._id,
        );

        createdTemplates += 1;
      }

      sheets.push({
        sheet: sheetName,
        userId: assignedUser._id.toString(),
        templates: rows.length,
      });
    }

    return {
      sourceExcel: basename(sourcePath),
      managerId: managerUser._id.toString(),
      totalTemplates: createdTemplates + updatedTemplates,
      createdTemplates,
      updatedTemplates,
      sheets,
    };
  }

  private parseRows(sheet: XLSX.WorkSheet) {
    return XLSX.utils
      .sheet_to_json<ExcelRow>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
      })
      .map((values, index) => ({ sourceRow: index + 1, values }))
      .filter(
        ({ values }) =>
          values[0] !== 'رديف' && Boolean(values[2]) && Boolean(values[6]),
      );
  }

  private createDescription(row: ExcelRow): string {
    return [
      ['شرح فعالیت', row[3]],
      ['خروجی فرایند', row[4]],
      ['سمت انجام‌دهنده', row[5]],
      ['تعداد دفعات', row[7]],
      ['مدت هر دفعه (دقیقه)', row[8]],
    ]
      .filter(([, value]) => value !== null && String(value).trim())
      .map(([label, value]) => `${label}: ${String(value).trim()}`)
      .join('\n');
  }
}
