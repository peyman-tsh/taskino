import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { FixedTaskSeedService } from '../services/fixed-task-seed.service';
/*
import * as bcrypt from 'bcryptjs';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  copyFileSync,
  statSync,
} from 'fs';
import { basename, join } from 'path';
import mongoose, { Types } from 'mongoose';
import * as XLSX from 'xlsx';
import {
  ExcelFile,
  ExcelSchema,
  ExcelStatus,
  ExcelType,
} from '../../excel/excel.schema';
import {
  FixedTaskRecurrence,
  FixedTaskTemplate,
  FixedTaskTemplateSchema,
} from '../fixed-task.schema';
import { WorkField } from '../../common/enums/work-field.enum';
import { User, UserRole, UserSchema } from '../../user/schemas/user.schema';

type ExcelRow = Array<string | number | null>;
type ParsedExcelRow = { sourceRow: number; values: ExcelRow };
type SeededUser = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: UserRole;
};

const recurrenceMap: Record<string, FixedTaskRecurrence> = {
  روزانه: FixedTaskRecurrence.DAILY,
  هفتگی: FixedTaskRecurrence.WEEKLY,
  هفتگي: FixedTaskRecurrence.WEEKLY,
  ماهانه: FixedTaskRecurrence.MONTHLY,
};

const seededUsers: Record<string, SeededUser> = {
  جلالیان: {
    firstName: 'کاربر',
    lastName: 'جلالیان',
    email: 'fixed-task.jalalian@taskino.local',
    mobile: '+989100000701',
    role: UserRole.SPECIALIST,
  },
  'امیر گنجی': {
    firstName: 'امیر',
    lastName: 'گنجی',
    email: 'fixed-task.amir-ganji@taskino.local',
    mobile: '+989100000702',
    role: UserRole.SPECIALIST,
  },
  اعلایی: {
    firstName: 'سینا',
    lastName: 'اعلایی',
    email: 'fixed-task.alaei@taskino.local',
    mobile: '+989100000703',
    role: UserRole.SUPERVISOR,
  },
  'اکبر گنجی': {
    firstName: 'اکبر',
    lastName: 'گنجی',
    email: 'fixed-task.akbar-ganji@taskino.local',
    mobile: '+989100000704',
    role: UserRole.SPECIALIST,
  },
};

function loadEnv(): Record<string, string> {
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter(
        (line) => line && !line.trim().startsWith('#') && line.includes('='),
      )
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim(),
        ];
      }),
  );
}

function parseRows(sheet: XLSX.WorkSheet): ParsedExcelRow[] {
  return XLSX.utils
    .sheet_to_json<ExcelRow>(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
    })
    .map((values, index) => ({ sourceRow: index + 1, values }))
    .filter(
      ({ values }) =>
        values[0] !== 'رديف' && Boolean(values[2]) && Boolean(values[6]),
    );
}

function createDescription(row: ExcelRow): string {
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

async function run(): Promise<void> {
  const sourcePath = process.argv[2];
  if (!sourcePath || !existsSync(sourcePath)) {
    throw new Error('Excel file path is required and must exist.');
  }

  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);

  const UserModel = mongoose.model(User.name, UserSchema);
  const FixedTaskModel = mongoose.model(
    FixedTaskTemplate.name,
    FixedTaskTemplateSchema,
  );
  const ExcelModel = mongoose.model(ExcelFile.name, ExcelSchema);
  const password = await bcrypt.hash(
    'SeedPass1234',
    Number(env.BCRYPT_SALT_ROUNDS || 10),
  );

  const manager = await UserModel.findOneAndUpdate(
    { email: 'fixed-task.manager@taskino.local' },
    {
      $set: {
        mobile: '+989100000700',
      },
      $setOnInsert: {
        firstName: 'مدیر',
        lastName: 'وظایف ثابت',
        email: 'fixed-task.manager@taskino.local',
        password,
        roles: UserRole.MANAGER,
        workField: WorkField.OPERATIONS,
        isActive: true,
        score: 0,
      },
    },
    { returnDocument: 'after', upsert: true },
  ).exec();

  const workbook = XLSX.readFile(sourcePath);
  const uploadDir = join(process.cwd(), 'uploads', 'excel');
  mkdirSync(uploadDir, { recursive: true });
  const storedFileName = `fixed-tasks-${basename(sourcePath)}`;
  const storedFilePath = join(uploadDir, storedFileName);
  copyFileSync(sourcePath, storedFilePath);

  let totalTemplates = 0;
  let createdTemplates = 0;
  let updatedTemplates = 0;
  const sheetResults: Array<{
    sheet: string;
    userId: string;
    templates: number;
  }> = [];

  for (const sheetName of workbook.SheetNames) {
    const userSeed = seededUsers[sheetName];
    if (!userSeed) {
      throw new Error(
        `No user mapping is configured for sheet "${sheetName}".`,
      );
    }

    const user = await UserModel.findOneAndUpdate(
      { email: userSeed.email },
      {
        $set: {
          firstName: userSeed.firstName,
          lastName: userSeed.lastName,
          mobile: userSeed.mobile,
          roles: userSeed.role,
          workField: WorkField.OPERATIONS,
          isActive: true,
        },
        $setOnInsert: {
          email: userSeed.email,
          password,
          score: 0,
        },
      },
      { returnDocument: 'after', upsert: true },
    ).exec();

    const rows = parseRows(workbook.Sheets[sheetName]);
    totalTemplates += rows.length;

    for (const { sourceRow, values: row } of rows) {
      const title = String(row[2]).trim();
      const recurrenceLabel = String(row[6]).trim();
      const recurrence = recurrenceMap[recurrenceLabel];
      if (!recurrence) {
        throw new Error(
          `Unknown recurrence "${recurrenceLabel}" in sheet "${sheetName}".`,
        );
      }

      const result = await FixedTaskModel.updateOne(
        {
          sourceExcel: basename(sourcePath),
          sourceSheet: sheetName,
          sourceRow,
        },
        {
          $set: {
            title,
            createdBy: manager._id,
            assignedTo: user._id,
            recurrence,
            description: createDescription(row),
            isActive: true,
            sourceExcel: basename(sourcePath),
            sourceSheet: sheetName,
            sourceRow,
          },
        },
        { upsert: true },
      ).exec();

      if (result.upsertedCount > 0) createdTemplates += 1;
      else updatedTemplates += 1;
    }

    sheetResults.push({
      sheet: sheetName,
      userId: user._id.toString(),
      templates: rows.length,
    });
  }

  const sourceStats = statSync(sourcePath);
  const excelRecord = await ExcelModel.findOneAndUpdate(
    {
      createdBy: new Types.ObjectId(manager._id),
      originalName: basename(sourcePath),
      type: ExcelType.IMPORT,
    },
    {
      $set: {
        fileName: storedFileName,
        originalName: basename(sourcePath),
        filePath: storedFilePath,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: sourceStats.size,
        type: ExcelType.IMPORT,
        status: ExcelStatus.COMPLETED,
        sheetName: workbook.SheetNames.join(', '),
        totalRows: totalTemplates,
        successRows: totalTemplates,
        errorRows: 0,
        errorMessage: '',
        columns: [
          'ورودی فرایند',
          'شرح فعاليت (پردازش)',
          'خروجی فرایند',
          'سمت انجام دهنده',
          'توالي',
          'تعداد دفعات',
          'مدت زمان انجام به ازای هر دفعه کاری (دقيقه)',
        ],
      },
    },
    { returnDocument: 'after', upsert: true },
  ).exec();

  console.log(
    JSON.stringify(
      {
        excelRecordId: excelRecord._id.toString(),
        storedFilePath,
        managerId: manager._id.toString(),
        totalTemplates,
        createdTemplates,
        updatedTemplates,
        sheets: sheetResults,
      },
      null,
      2,
    ),
  );
}

*/

async function runSeed(): Promise<void> {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    throw new Error('Excel file path is required.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const result = await app.get(FixedTaskSeedService).seed(sourcePath);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

runSeed()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
