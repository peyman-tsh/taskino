import * as bcrypt from 'bcryptjs';
import { existsSync, mkdirSync, readFileSync, copyFileSync, statSync } from 'fs';
import { basename, join } from 'path';
import mongoose, { Types } from 'mongoose';
import * as XLSX from 'xlsx';
import { ExcelFile, ExcelSchema, ExcelStatus, ExcelType } from '../../excel/excel.schema';
import {
  FixedTaskRecurrence,
  FixedTaskTemplate,
  FixedTaskTemplateSchema,
} from '../../fixedTask/fixed-task.schema';
import { WorkField } from '../../common/enums/work-field.enum';
import { User, UserRole, UserSchema } from '../../user/schemas/user.schema';

type ExcelRow = Array<string | number | null>;

const recurrenceMap: Record<string, FixedTaskRecurrence> = {
  روزانه: FixedTaskRecurrence.DAILY,
  هفتگی: FixedTaskRecurrence.WEEKLY,
  هفتگي: FixedTaskRecurrence.WEEKLY,
  ماهانه: FixedTaskRecurrence.MONTHLY,
};

const seededUsers: Record<string, { email: string; mobile: string; role: UserRole }> = {
  جلالیان: {
    email: 'fixed-task.jalalian@taskino.local',
    mobile: '+989100000701',
    role: UserRole.SPECIALIST,
  },
  'امیر گنجی': {
    email: 'fixed-task.amir-ganji@taskino.local',
    mobile: '+989100000702',
    role: UserRole.SPECIALIST,
  },
  اعلایی: {
    email: 'fixed-task.alaei@taskino.local',
    mobile: '+989100000703',
    role: UserRole.SUPERVISOR,
  },
  'اکبر گنجی': {
    email: 'fixed-task.akbar-ganji@taskino.local',
    mobile: '+989100000704',
    role: UserRole.SPECIALIST,
  },
};

function loadEnv(): Record<string, string> {
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()];
      }),
  );
}

function splitName(sheetName: string): { firstName: string; lastName: string } {
  const parts = sheetName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: 'کاربر', lastName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function parseRows(sheet: XLSX.WorkSheet): ExcelRow[] {
  return XLSX.utils
    .sheet_to_json<ExcelRow>(sheet, { header: 1, defval: null, blankrows: false })
    .slice(1)
    .filter((row) => Boolean(row[2]) && Boolean(row[6]));
}

async function run(): Promise<void> {
  const sourcePath = process.argv[2];
  if (!sourcePath || !existsSync(sourcePath)) {
    throw new Error('Excel file path is required and must exist.');
  }

  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);

  const UserModel = mongoose.model(User.name, UserSchema);
  const FixedTaskModel = mongoose.model(FixedTaskTemplate.name, FixedTaskTemplateSchema);
  const ExcelModel = mongoose.model(ExcelFile.name, ExcelSchema);
  const password = await bcrypt.hash('SeedPass1234', Number(env.BCRYPT_SALT_ROUNDS || 10));

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
  const sheetResults: Array<{ sheet: string; userId: string; templates: number }> = [];

  for (const sheetName of workbook.SheetNames) {
    const userSeed = seededUsers[sheetName];
    if (!userSeed) {
      throw new Error(`No user mapping is configured for sheet "${sheetName}".`);
    }

    const name = splitName(sheetName);
    const user = await UserModel.findOneAndUpdate(
      { email: userSeed.email },
      {
        $set: {
          mobile: userSeed.mobile,
        },
        $setOnInsert: {
          ...name,
          email: userSeed.email,
          password,
          roles: userSeed.role,
          workField: WorkField.OPERATIONS,
          isActive: true,
          score: 0,
        },
      },
      { returnDocument: 'after', upsert: true },
    ).exec();

    const rows = parseRows(workbook.Sheets[sheetName]);
    totalTemplates += rows.length;

    for (const [rowIndex, row] of rows.entries()) {
      const title = String(row[2]).trim();
      const recurrenceLabel = String(row[6]).trim();
      const recurrence = recurrenceMap[recurrenceLabel];
      if (!recurrence) {
        throw new Error(`Unknown recurrence "${recurrenceLabel}" in sheet "${sheetName}".`);
      }

      const sourceRow = rowIndex + 2;
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
            description: '',
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

    sheetResults.push({ sheet: sheetName, userId: user._id.toString(), templates: rows.length });
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
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: sourceStats.size,
        type: ExcelType.IMPORT,
        status: ExcelStatus.COMPLETED,
        sheetName: workbook.SheetNames.join(', '),
        totalRows: totalTemplates,
        successRows: totalTemplates,
        errorRows: 0,
        errorMessage: '',
        columns: ['ورودی فرایند', 'توالي'],
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

run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
