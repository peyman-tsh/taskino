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
import { FixedTaskScoreService } from './fixed-task-score.service';

type ExcelRow = Array<string | number | null>;

const PASSWORD = '123456';
export const FIXED_TASK_SEED_EXCEL_PATH =
  'C:\\Users\\Zarnegar\\Downloads\\-1408847228164432127_81294547954101.xlsx';

const recurrenceMap: Record<string, FixedTaskRecurrence> = {
  روزانه: FixedTaskRecurrence.DAILY,
  هفتگی: FixedTaskRecurrence.WEEKLY,
  هفتگي: FixedTaskRecurrence.WEEKLY,
  ماهانه: FixedTaskRecurrence.MONTHLY,
};

const manager: SeedUserData = {
  firstName: 'پوریا',
  lastName: 'یاری زاده',
  email: 'pouria.yarizadeh@taskino.local',
  mobile: '09378675840',
  role: UserRole.MANAGER,
};

const sheetUsers: Record<string, SeedUserData> = {
  جلالیان: {
    firstName: 'امیر رضا',
    lastName: 'جلالیان',
    email: 'amirreza.jalalian@taskino.local',
    mobile: '09223689925',
    role: UserRole.SPECIALIST,
  },
  'امیر گنجی': {
    firstName: 'امیر',
    lastName: 'گنجی',
    email: 'amir.ganji@taskino.local',
    mobile: '09102425368',
    role: UserRole.SPECIALIST,
  },
  اعلایی: {
    firstName: 'سینا',
    lastName: 'اعلایی',
    email: 'sina.alaei@taskino.local',
    mobile: '09358776662',
    role: UserRole.SUPERVISOR,
  },
  'اکبر گنجی': {
    firstName: 'اکبر',
    lastName: 'گنجی',
    email: 'akbar.ganji@taskino.local',
    mobile: '09363611863',
    role: UserRole.SPECIALIST,
  },
};

@Injectable()
export class FixedTaskSeedService {
  constructor(
    private readonly repository: FixedTaskSeedRepository,
    private readonly configService: ConfigService,
    private readonly scoreService: FixedTaskScoreService,
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

        const result = await this.repository.upsertFixedTask(
          {
            title: String(values[2]).trim(),
            recurrence,
            description: this.createDescription(values),
            nextRunAt: this.scoreService.getNextDeadline(recurrence),
            sourceExcel: basename(sourcePath),
            sourceSheet: sheetName,
            sourceRow,
          },
          managerUser._id,
          assignedUser._id,
        );

        if (result === 'created') createdTemplates += 1;
        else updatedTemplates += 1;
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
