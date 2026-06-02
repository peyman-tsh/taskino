import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { join } from 'path';
import { CreateExcelDto } from './dto/create-excel.dto';
import { UpdateExcelDto } from './dto/update-excel.dto';
import { ExcelFile, ExcelDocument, ExcelType, ExcelStatus } from './excel.schema';
import { NodeFileSystem } from './file-system.provider';
import type { IFileSystem } from './file-system.provider';

// Constants
const FIRST_SHEET_INDEX = 1;
const DEFAULT_SHEET_NAME = 'Sheet1';
const UPLOAD_DIR_SEGMENT = 'excel';

// Allowed MIME types for Excel files
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/csv',
  'text/csv',
];

/**
 * Excel Service
 * Handles Excel file uploads, exports, and processing operations.
 */
@Injectable()
export class ExcelService {
  private readonly uploadDir: string;

  constructor(
    @InjectModel(ExcelFile.name)
    private readonly excelModel: Model<ExcelDocument>,
    @Inject(NodeFileSystem.name)
    private readonly fileSystem: IFileSystem,
  ) {
    this.uploadDir = join(process.cwd(), 'uploads', UPLOAD_DIR_SEGMENT);
  }

  /**
   * Validates if a given ID is a valid MongoDB ObjectId.
   * @throws BadRequestException if the ID is invalid.
   */
  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID: ${id}`);
    }
  }

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
   * Find Excel record by ID with populated createdBy
   * @throws NotFoundException if record not found
   */
  async findById(id: string): Promise<ExcelDocument> {
    this.validateObjectId(id);

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
   * Update Excel record with only provided fields
   */
  async update(id: string, updateExcelDto: UpdateExcelDto): Promise<ExcelFile> {
    this.validateObjectId(id);

    const excelFile = await this.excelModel.findById(id).exec();
    if (!excelFile) {
      throw new NotFoundException('Excel record not found');
    }

    // Build update object only with defined values
    const updateData: Record<string, unknown> = Object.fromEntries(
      Object.entries(updateExcelDto).filter(([_, value]) => value !== undefined),
    );

    return this.excelModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .exec() as Promise<ExcelFile>;
  }

  /**
   * Delete Excel record and its physical file
   */
  async delete(id: string): Promise<void> {
    this.validateObjectId(id);

    const excelFile = await this.excelModel.findById(id).exec();
    if (!excelFile) {
      throw new NotFoundException('Excel record not found');
    }

    // Delete physical file if exists
    if (excelFile.filePath) {
      try {
        await this.fileSystem.unlink(excelFile.filePath);
      } catch {
        // Ignore file deletion errors (file may already be deleted)
      }
    }

    await this.excelModel.findByIdAndDelete(id).exec();
  }

  /**
   * Ensure the upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    await this.fileSystem.mkdir(this.uploadDir, { recursive: true });
  }

  /**
   * Upload Excel file and create a database record
   * @throws BadRequestException if file type is invalid or missing
   */
  async uploadFile(
    file: any,
    createdBy: string,
    type: ExcelType = ExcelType.IMPORT,
  ): Promise<ExcelFile> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!Types.ObjectId.isValid(createdBy)) {
      throw new BadRequestException('Invalid createdBy user ID');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only Excel files (.xlsx, .xls, .csv) are allowed.',
      );
    }

    // Ensure upload directory exists
    await this.ensureUploadDir();

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = join(this.uploadDir, fileName);

    // Save file asynchronously via file system abstraction
    await this.fileSystem.writeFile(filePath, file.buffer);

    // Extract columns and row count from Excel file
    const { columns, totalRows } = this.extractExcelMetadata(file.buffer);

    const excelRecord = new this.excelModel({
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

    return excelRecord.save();
  }

  /**
   * Extract column headers and row count from Excel file buffer
   */
  private extractExcelMetadata(buffer: Buffer | Buffer[]): { columns: string[]; totalRows: number } {
    let columns: string[] = [];
    let totalRows = 0;

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet(FIRST_SHEET_INDEX);

      if (worksheet) {
        worksheet.getRow(1).eachCell((cell) => {
          if (cell.value) {
            columns.push(String(cell.value));
          }
        });
        totalRows = worksheet.rowCount - 1; // Exclude header row
      }
    } catch {
      // If parsing fails, return empty metadata
      return { columns: [], totalRows: 0 };
    }

    return { columns, totalRows };
  }

  /**
   * Get Excel file document for download
   * @throws NotFoundException if file doesn't exist on server
   */
  async getFile(id: string): Promise<ExcelFile> {
    const excelFile = await this.findById(id);

    const fileExists = await this.fileSystem.access(excelFile.filePath);

    if (!fileExists) {
      throw new NotFoundException('File not found on server');
    }

    return excelFile;
  }

  /**
   * Generate Excel file buffer from 2D array data
   */
  async generateExcelBuffer(
    data: any[][],
    sheetName: string = DEFAULT_SHEET_NAME,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length > 0) {
      // First row is header
      worksheet.addRow(data[0]);
      // Remaining rows are data
      for (let i = 1; i < data.length; i++) {
        worksheet.addRow(data[i]);
      }
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Generate Excel file buffer from array of objects
   * @param objects Array of objects to convert to Excel rows
   * @param columns Optional array of column keys; auto-detected if not provided
   * @param sheetName Name of the worksheet
   */
  async generateExcelFromObjects(
    objects: Record<string, any>[],
    columns?: string[],
    sheetName: string = DEFAULT_SHEET_NAME,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    const columnKeys = columns || (objects.length > 0 ? Object.keys(objects[0]) : []);

    // Add header row
    worksheet.addRow(columnKeys);

    // Add data rows
    objects.forEach((obj) => {
      worksheet.addRow(columnKeys.map((col) => obj[col]));
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  /**
   * Process an imported Excel file and count valid/empty rows
   * @throws BadRequestException if the file is not an import type
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
      // Read file via file system abstraction
      const buffer = await this.fileSystem.readFile(excelFile.filePath);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const worksheet = workbook.getWorksheet(FIRST_SHEET_INDEX);

      if (!worksheet) {
        throw new Error('No worksheet found in file');
      }

      let successCount = 0;
      let errorCount = 0;

      // Iterate through data rows (skip header)
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        try {
          const rowValues: any[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            rowValues.push(cell.value);
          });

          const hasData = rowValues.some(
            (v) => v !== undefined && v !== null && v !== '',
          );

          if (hasData) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      excelFile.status = ExcelStatus.COMPLETED;
      excelFile.successRows = successCount;
      excelFile.errorRows = errorCount;
      await excelFile.save();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      excelFile.status = ExcelStatus.FAILED;
      excelFile.errorMessage = errorMessage;
      await excelFile.save();
    }

    return excelFile;
  }

  /**
   * Get statistics about Excel files for a specific user
   */
  async getStatistics(userId: string): Promise<{
    totalImports: number;
    totalExports: number;
    completedImports: number;
    failedImports: number;
    totalFiles: number;
  }> {
    this.validateObjectId(userId);

    const query = { createdBy: new Types.ObjectId(userId) };

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