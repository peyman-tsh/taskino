import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

const FIRST_SHEET_INDEX = 1;
const DEFAULT_SHEET_NAME = 'Sheet1';

@Injectable()
export class ExcelWorkbookService {
  extractMetadata(buffer: Buffer | Buffer[]): {
    columns: string[];
    totalRows: number;
  } {
    const columns: string[] = [];

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet(FIRST_SHEET_INDEX);

      if (!worksheet) {
        return { columns, totalRows: 0 };
      }

      worksheet.getRow(1).eachCell((cell) => {
        if (cell.value) {
          columns.push(String(cell.value));
        }
      });

      return { columns, totalRows: worksheet.rowCount - 1 };
    } catch {
      return { columns: [], totalRows: 0 };
    }
  }

  async generateFromRows(
    data: unknown[][],
    sheetName = DEFAULT_SHEET_NAME,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    data.forEach((row) => worksheet.addRow(row));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generateFromObjects(
    objects: Record<string, unknown>[],
    columns?: string[],
    sheetName = DEFAULT_SHEET_NAME,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);
    const columnKeys =
      columns ?? (objects.length > 0 ? Object.keys(objects[0]) : []);

    worksheet.addRow(columnKeys);
    objects.forEach((object) => {
      worksheet.addRow(columnKeys.map((column) => object[column]));
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async countImportRows(buffer: Buffer): Promise<{
    successRows: number;
    errorRows: number;
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet(FIRST_SHEET_INDEX);

    if (!worksheet) {
      throw new Error('No worksheet found in file');
    }

    let successRows = 0;
    let errorRows = 0;
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const values: unknown[] = [];
      worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
        values.push(cell.value);
      });
      const hasData = values.some(
        (value) => value !== undefined && value !== null && value !== '',
      );
      if (hasData) {
        successRows++;
      } else {
        errorRows++;
      }
    }

    return { successRows, errorRows };
  }
}
