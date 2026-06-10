import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExcelType, ExcelStatus } from '../excel.schema';

export class UpdateExcelDto {
  @ApiPropertyOptional({
    description: 'File path on server',
    example: '/uploads/excel/2026/employees_data.xlsx',
  })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({
    description: 'MIME type of the file',
    example:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 25600 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'Processing status',
    enum: ExcelStatus,
    example: ExcelStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(ExcelStatus)
  status?: ExcelStatus;

  @ApiPropertyOptional({ description: 'Sheet name', example: 'Sheet1' })
  @IsOptional()
  @IsString()
  sheetName?: string;

  @ApiPropertyOptional({ description: 'Total number of rows', example: 100 })
  @IsOptional()
  @IsNumber()
  totalRows?: number;

  @ApiPropertyOptional({
    description: 'Number of successfully processed rows',
    example: 95,
  })
  @IsOptional()
  @IsNumber()
  successRows?: number;

  @ApiPropertyOptional({
    description: 'Number of rows with errors',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  errorRows?: number;

  @ApiPropertyOptional({
    description: 'Error message if processing failed',
    example: 'Invalid data in row 15',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Column headers',
    example: ['name', 'email', 'department'],
  })
  @IsOptional()
  columns?: string[];
}

export class ImportExcelDto {
  @ApiProperty({
    description: 'ID of the user who is importing',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
  })
  @IsString()
  @IsMongoId()
  userId: string;

  @ApiPropertyOptional({
    description: 'Type of data being imported',
    example: 'tasks',
  })
  @IsOptional()
  @IsString()
  dataType?: string;
}

export class ExportExcelDto {
  @ApiProperty({
    description: 'ID of the user who is exporting',
    example: '64a7b1c2d3e4f5a6b7c8d9e0',
  })
  @IsString()
  @IsMongoId()
  userId: string;

  @ApiProperty({ description: 'Type of data being exported', example: 'tasks' })
  @IsString()
  dataType: string;

  @ApiPropertyOptional({
    description: 'Sheet name for the export',
    example: 'Tasks Export',
  })
  @IsOptional()
  @IsString()
  sheetName?: string;

  @ApiPropertyOptional({
    description: 'Column headers to include in export',
    example: ['title', 'status', 'assignedTo'],
  })
  @IsOptional()
  columns?: string[];
}
