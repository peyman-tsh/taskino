import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type ExcelDocument = HydratedDocument<ExcelFile>;

export enum ExcelType {
  IMPORT = 'import',
  EXPORT = 'export',
}

export enum ExcelStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret.__v;
      delete ret._id;
      return ret;
    },
  },
})
export class ExcelFile {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  createdBy: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  fileName: string;

  @Prop({
    type: String,
    default: '',
  })
  originalName: string;

  @Prop({
    type: String,
    default: '',
  })
  filePath: string;

  @Prop({
    type: String,
    default: '',
  })
  mimeType: string;

  @Prop({
    type: Number,
    default: 0,
  })
  fileSize: number;

  @Prop({
    enum: ExcelType,
    default: ExcelType.EXPORT,
  })
  type: ExcelType;

  @Prop({
    enum: ExcelStatus,
    default: ExcelStatus.PENDING,
  })
  status: ExcelStatus;

  @Prop({
    type: String,
    default: '',
  })
  sheetName: string;

  @Prop({
    type: Number,
    default: 0,
  })
  totalRows: number;

  @Prop({
    type: Number,
    default: 0,
  })
  successRows: number;

  @Prop({
    type: Number,
    default: 0,
  })
  errorRows: number;

  @Prop({
    type: String,
    default: '',
  })
  errorMessage: string;

  @Prop({
    type: [String],
    default: [],
  })
  columns: string[];

  @Prop({
    type: Types.ObjectId,
    ref: 'Leave',
  })
  relatedLeave?: Types.ObjectId;

  @Prop()
  expiresAt?: Date;
}

export const ExcelSchema = SchemaFactory.createForClass(ExcelFile);

// Index for faster queries
ExcelSchema.index({ createdBy: 1, createdAt: -1 });
ExcelSchema.index({ status: 1 });
ExcelSchema.index({ type: 1 });
ExcelSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ExcelSchema.virtual('relatedTask', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'excelFile',
  justOne: true,
});
