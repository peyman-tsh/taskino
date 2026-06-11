import { Injectable } from '@nestjs/common';
import { CreateExcelDto } from '../dto/create-excel.dto';
import { UpdateExcelDto } from '../dto/update-excel.dto';
import {
  ExcelDocument,
  ExcelFile,
  ExcelStatus,
  ExcelType,
} from '../excel.schema';
import {
  ExcelFilters,
  ExcelRecordService,
} from './excel-record.service';
import { ExcelImportService } from './excel-import.service';
import { ExcelStorageService } from './excel-storage.service';
import { ExcelUploadService } from './excel-upload.service';
import { ExcelWorkbookService } from './excel-workbook.service';

const DEFAULT_SHEET_NAME = 'Sheet1';

/**
 * Public facade for Excel module use-cases.
 * Specialized services own persistence, storage, upload, import, and workbook logic.
 */
@Injectable()
export class ExcelService {
  constructor(
    private readonly recordService: ExcelRecordService,
    private readonly storageService: ExcelStorageService,
    private readonly uploadService: ExcelUploadService,
    private readonly importService: ExcelImportService,
    private readonly workbookService: ExcelWorkbookService,
  ) {}

  create(dto: CreateExcelDto): Promise<ExcelDocument> {
    return this.recordService.create(dto);
  }

  findAll(page = 1, limit = 10, filters?: ExcelFilters) {
    return this.recordService.findAll(page, limit, filters);
  }

  findById(id: string): Promise<ExcelDocument> {
    return this.recordService.findById(id);
  }

  update(id: string, dto: UpdateExcelDto): Promise<ExcelFile> {
    return this.recordService.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    const excelFile = await this.recordService.findRawById(id);
    await this.storageService.deleteIfExists(excelFile.filePath);
    await this.recordService.delete(id, excelFile._id);
  }

  uploadFile(
    file: Express.Multer.File,
    createdBy: string,
    type: ExcelType = ExcelType.IMPORT,
  ): Promise<ExcelDocument> {
    return this.uploadService.upload(file, createdBy, type);
  }

  async getFile(id: string): Promise<ExcelFile> {
    const excelFile = await this.recordService.findById(id);
    await this.storageService.ensureExists(excelFile.filePath);
    return excelFile;
  }

  generateExcelBuffer(
    data: unknown[][],
    sheetName = DEFAULT_SHEET_NAME,
  ): Promise<Buffer> {
    return this.workbookService.generateFromRows(data, sheetName);
  }

  generateExcelFromObjects(
    objects: Record<string, unknown>[],
    columns?: string[],
    sheetName = DEFAULT_SHEET_NAME,
  ): Promise<Buffer> {
    return this.workbookService.generateFromObjects(
      objects,
      columns,
      sheetName,
    );
  }

  processImport(excelId: string): Promise<ExcelFile> {
    return this.importService.process(excelId);
  }

  getStatistics(userId: string): Promise<{
    totalImports: number;
    totalExports: number;
    completedImports: number;
    failedImports: number;
    totalFiles: number;
  }> {
    return this.recordService.getStatistics(userId);
  }
}
