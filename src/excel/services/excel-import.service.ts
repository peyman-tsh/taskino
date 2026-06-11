import { BadRequestException, Injectable } from '@nestjs/common';
import { ExcelFile, ExcelStatus, ExcelType } from '../excel.schema';
import { ExcelRecordService } from './excel-record.service';
import { ExcelStorageService } from './excel-storage.service';
import { ExcelWorkbookService } from './excel-workbook.service';

@Injectable()
export class ExcelImportService {
  constructor(
    private readonly recordService: ExcelRecordService,
    private readonly storageService: ExcelStorageService,
    private readonly workbookService: ExcelWorkbookService,
  ) {}

  async process(excelId: string): Promise<ExcelFile> {
    const excelFile = await this.recordService.findRawById(excelId);
    if (excelFile.type !== ExcelType.IMPORT) {
      throw new BadRequestException('This is not an import file');
    }

    excelFile.status = ExcelStatus.PROCESSING;
    await excelFile.save();

    try {
      const buffer = await this.storageService.read(excelFile.filePath);
      const { successRows, errorRows } =
        await this.workbookService.countImportRows(buffer);
      excelFile.status = ExcelStatus.COMPLETED;
      excelFile.successRows = successRows;
      excelFile.errorRows = errorRows;
    } catch (error: unknown) {
      excelFile.status = ExcelStatus.FAILED;
      excelFile.errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
    }

    await excelFile.save();
    return excelFile;
  }
}
