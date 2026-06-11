import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { CreateExcelDto } from '../dto/create-excel.dto';
import { UpdateExcelDto } from '../dto/update-excel.dto';
import {
  ExcelDocument,
  ExcelFile,
  ExcelStatus,
  ExcelType,
} from '../excel.schema';

export interface ExcelFilters {
  createdBy?: string;
  status?: ExcelStatus;
  type?: ExcelType;
}

@Injectable()
export class ExcelRepository {
  constructor(
    @InjectModel(ExcelFile.name)
    private readonly excelModel: Model<ExcelDocument>,
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  create(data: CreateExcelDto | Partial<ExcelFile>): Promise<ExcelDocument> {
    return new this.excelModel(data).save();
  }

  async findAll(page = 1, limit = 10, filters?: ExcelFilters) {
    const query = this.buildFilterQuery(filters);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.populate(
        this.excelModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
      ).exec(),
      this.excelModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<ExcelDocument> {
    this.validateObjectId(id);
    const excelFile = await this.populate(this.excelModel.findById(id)).exec();
    if (!excelFile) {
      throw new NotFoundException('Excel record not found');
    }

    return excelFile;
  }

  async findRawById(id: string): Promise<ExcelDocument> {
    this.validateObjectId(id);
    const excelFile = await this.excelModel.findById(id).exec();
    if (!excelFile) {
      throw new NotFoundException('Excel record not found');
    }

    return excelFile;
  }

  async update(id: string, dto: UpdateExcelDto): Promise<ExcelFile> {
    await this.findRawById(id);
    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );

    return this.populate(
      this.excelModel.findByIdAndUpdate(id, updateData, { new: true }),
    ).exec() as Promise<ExcelFile>;
  }

  async delete(id: string, excelFileId: Types.ObjectId): Promise<void> {
    await this.connection
      .collection('tasks')
      .updateMany(
        { excelFile: excelFileId },
        { $unset: { excelFile: '', file: '' } },
      );
    await this.excelModel.findByIdAndDelete(id).exec();
  }

  async getStatistics(userId: string) {
    this.validateObjectId(userId);
    const query = { createdBy: new Types.ObjectId(userId) };
    const [total, imports, exports, completed, failed] = await Promise.all([
      this.excelModel.countDocuments(query),
      this.excelModel.countDocuments({ ...query, type: ExcelType.IMPORT }),
      this.excelModel.countDocuments({ ...query, type: ExcelType.EXPORT }),
      this.excelModel.countDocuments({
        ...query,
        status: ExcelStatus.COMPLETED,
      }),
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

  validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ID: ${id}`);
    }
  }

  private buildFilterQuery(filters?: ExcelFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (filters?.createdBy && Types.ObjectId.isValid(filters.createdBy)) {
      query.createdBy = new Types.ObjectId(filters.createdBy);
    }
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;
    return query;
  }

  private populate(query: any) {
    return query
      .populate('createdBy', 'firstName lastName email')
      .populate('relatedTask', 'title status startDate dueDate');
  }
}
