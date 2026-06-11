import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  ExcelDocument,
  ExcelStatus,
  ExcelType,
} from '../excel.schema';
import { ExcelRepository } from '../repositories/excel.repository';
import { ExcelStorageService } from './excel-storage.service';
import { ExcelWorkbookService } from './excel-workbook.service';

const DEFAULT_SHEET_NAME = 'Sheet1';
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/csv',
  'text/csv',
];

@Injectable()
export class ExcelUploadService {
  constructor(
    private readonly recordService: ExcelRepository,
    private readonly storageService: ExcelStorageService,
    private readonly workbookService: ExcelWorkbookService,
  ) {}

  async upload(
    file: Express.Multer.File,
    createdBy: string,
    type: ExcelType = ExcelType.IMPORT,
  ): Promise<ExcelDocument> {
    this.validateUpload(file, createdBy);
    const { fileName, filePath } = await this.storageService.save(file);
    const { columns, totalRows } = this.workbookService.extractMetadata(
      file.buffer,
    );

    return this.recordService.create({
      createdBy: new Types.ObjectId(createdBy),
      fileName,
      originalName: file.originalname,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      type,
      status: ExcelStatus.COMPLETED,
      sheetName: DEFAULT_SHEET_NAME,
      totalRows,
      successRows: totalRows,
      errorRows: 0,
      columns,
    });
  }

  private validateUpload(file: Express.Multer.File, createdBy: string): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (!Types.ObjectId.isValid(createdBy)) {
      throw new BadRequestException('Invalid createdBy user ID');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only Excel files (.xlsx, .xls, .csv) are allowed.',
      );
    }
  }
}
