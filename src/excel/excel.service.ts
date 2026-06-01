import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { CreateExcelDto } from './dto/create-excel.dto';
import { UpdateExcelDto } from './dto/update-excel.dto';
import { ExcelFile, ExcelDocument, ExcelType, ExcelStatus } from './excel.schema';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ExcelService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'excel');

  constructor(
    @InjectModel(ExcelFile.name)
    private readonly excelModel: Model<ExcelDocument>,
  ) {}

  /**
   * Create a new Excel record
   */
  async create(createExcelDto: CreateExcelDto): Promise<ExcelDocument> {
    const createdExcel = new this.excelModel(createExcelDto);
    return createdExcel.save();
  }

  /**
   * Find all Excel records with pagination and filters
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      createdBy?: string;
      status?: ExcelStatus;
      type?: ExcelType;
    },
  ): Promise<{
    data: ExcelDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (filters?.createdBy && Types.ObjectId.isValid(filters.createdBy)) {
      query.createdBy = new Types.ObjectId(filters.createdBy);
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.type) {
      query.type = filters.type;
    }

    const [data, total] = await Promise.all([
      this.excelModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate('createdBy', 'firstName lastName email')
        .exec(),
      this.excelModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Find Excel record by ID
   */
  async findById(id: string): Promise<ExcelDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Excel record ID');
    }

    const excelFile = await this.excelModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!excelFile) {
      throw new NotFoundException('Excel record not found');
    }

    return excelFile;
  }

  /**
   * Update Excel record
   */
  async update(id: string, updateExcelDto: UpdateExcelDto): Promise<ExcelFile> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Excel record ID');
    }

    const excelFile = await this.excelModel.findById(id).exec();
    if (!excelFile) {
      throw new NotFoundException('Excel record not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateExcelDto.filePath !== undefined) updateData.filePath = updateExcelDto.filePath;
    if (updateExcelDto.mimeType !== undefined) updateData.mimeType = updateExcelDto.mimeType;
    if (updateExcelDto.fileSize !== undefined) updateData.fileSize = updateExcelDto.fileSize;
    if (updateExcelDto.status !== undefined) updateData.status = updateExcelDto.status;
    if (updateExcelDto.sheetName !== undefined) updateData.sheetName = updateExcelDto.sheetName;
    if (updateExcelDto.totalRows !== undefined) updateData.totalRows = updateExcelDto.totalRows;
    if (updateExcelDto.successRows !== undefined) updateData.successRows = updateExcelDto.successRows;
    if (updateExcelDto.errorRows !== undefined) updateData.errorRows = updateExcelDto.errorRows;
    if (updateExcelDto.errorMessage !== undefined) updateData.errorMessage = updateExcelDto.errorMessage;
    if (updateExcelDto.columns !== undefined) updateData.columns = updateExcelDto.columns;

    return this.excelModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .exec() as Promise<ExcelFile>;
  }

  /**
   * Delete Excel record and file
   */
  async delete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Excel record ID');
    }

    const excelFile = await this.excelModel.findById(id).exec();
    if (!excelFile) {
      throw new NotFoundException('Excel record not found');
    }

    // Delete physical file if exists
    if (excelFile.filePath) {
      try {
        await unlink(excelFile.filePath);
      } catch (err) {
        // Ignore file deletion errors
      }
    }

    await this.excelModel.findByIdAndDelete(id).exec();
  }

  /**
   * Upload Excel file and create record
   */
  async uploadFile(file: any, createdBy: string, type: ExcelType = ExcelType.IMPORT): Promise<ExcelFile> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/csv',
      'text/csv',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only Excel files are allowed.');
    }

    // Create upload directory if not exists
    const fs = require('fs');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = join(this.uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    // Read columns from Excel
    let columns: string[] = [];
    let totalRows = 0;

    if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);
      const worksheet = workbook.getWorksheet(1);
      if (worksheet) {
        columns = [];
        worksheet.getRow(1).eachCell((cell) => {
          if (cell.value) {
            columns.push(String(cell.value));
          }
        });
        totalRows = worksheet.rowCount - 1; // Exclude header row
      }
    }

    const excelRecord = new this.excelModel({
      createdBy: new Types.ObjectId(createdBy),
      fileName,
      originalName: file.originalname,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      type,
      status: ExcelStatus.COMPLETED,
      sheetName: 'Sheet1',
      totalRows,
      successRows: totalRows,
      errorRows: 0,
      columns,
    });

    return excelRecord.save() as Promise<ExcelFile>;
  }

  /**
   * Get Excel file for download
   */
  async getFile(id: string): Promise<ExcelFile> {
    const excelFile = await this.findById(id);

    if (!excelFile.filePath || !require('fs').existsSync(excelFile.filePath)) {
      throw new NotFoundException('File not found on server');
    }

    return excelFile;
  }

  /**
   * Generate Excel file buffer from data
   */
  async generateExcelBuffer(
    data: any[][],
    sheetName: string = 'Sheet1',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add header row
    if (data.length > 0) {
      worksheet.addRow(data[0]);
      // Add data rows
      for (let i = 1; i < data.length; i++) {
        worksheet.addRow(data[i]);
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }

  /**
   * Generate Excel file buffer from array of objects
   */
  async generateExcelFromObjects(
    objects: Record<string, any>[],
    columns?: string[],
    sheetName: string = 'Sheet1',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    const cols = columns || (objects.length > 0 ? Object.keys(objects[0]) : []);

    // Add header row
    worksheet.addRow(cols);

    // Add data rows
    objects.forEach((obj) => {
      const row = cols.map((col) => obj[col]);
      worksheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }

  /**
   * Process imported Excel data
   */
  async processImport(excelId: string): Promise<ExcelFile> {
    const excelFile = await this.findById(excelId);

    if (excelFile.type !== ExcelType.IMPORT) {
      throw new BadRequestException('This is not an import file');
    }

    // Update status to processing
    excelFile.status = ExcelStatus.PROCESSING;
    await excelFile.save();

    try {
      const buffer = require('fs').readFileSync(excelFile.filePath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        throw new Error('No worksheet found in file');
      }

      let successCount = 0;
      let errorCount = 0;

      // Iterate through data rows (skip header)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        try {
          // Process each row - collect cell values
          const rowValues: any[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            rowValues.push(cell.value);
          });
          const hasData = rowValues.some((v) => v !== undefined && v !== null && v !== '');
          if (hasData) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          errorCount++;
        }
      }

      excelFile.status = ExcelStatus.COMPLETED;
      excelFile.successRows = successCount;
      excelFile.errorRows = errorCount;
      await excelFile.save();

      return excelFile;
    } catch (error: any) {
      excelFile.status = ExcelStatus.FAILED;
      excelFile.errorMessage = error?.message || 'Unknown error occurred';
      await excelFile.save();
      return excelFile;
    }
  }

  /**
   * Get statistics about Excel files
   */
  async getStatistics(userId: string): Promise<{
    totalImports: number;
    totalExports: number;
    completedImports: number;
    failedImports: number;
    totalFiles: number;
  }> {
    const query = Types.ObjectId.isValid(userId)
      ? { createdBy: new Types.ObjectId(userId) }
      : {};

    const [total, imports, exports, completed, failed] = await Promise.all([
      this.excelModel.countDocuments(query),
      this.excelModel.countDocuments({ ...query, type: ExcelType.IMPORT }),
      this.excelModel.countDocuments({ ...query, type: ExcelType.EXPORT }),
      this.excelModel.countDocuments({ ...query, status: ExcelStatus.COMPLETED }),
      this.excelModel.countDocuments({ ...query, status: ExcelStatus.FAILED }),
    ]);

    return {
      totalImports: imports,
      totalExports: exports,
      completedImports: completed,
      failedImports: failed,
      totalFiles: total,
    };
  }
}