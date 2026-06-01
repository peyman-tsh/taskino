import { IsString, IsNotEmpty, IsOptional, IsEnum, IsMongoId, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExcelType, ExcelStatus } from '../excel.schema';

export class CreateExcelDto {
  @ApiProperty({ description: 'ID of the user who uploaded/downloaded the file', example: '64a7b1c2d3e4f5a6b7c8d9e0' })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  createdBy: string;

  @ApiProperty({ description: 'Excel file name', example: 'employees_data.xlsx' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiPropertyOptional({ description: 'Original file name', example: 'Employees_2026.xlsx' })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({ description: 'File path on server', example: '/uploads/excel/2026/employees_data.xlsx' })
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiPropertyOptional({ description: 'MIME type of the file', example: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'File size in bytes', example: 25600 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: 'Type of Excel operation', enum: ExcelType, example: ExcelType.IMPORT })
  @IsOptional()
  @IsEnum(ExcelType)
  type?: ExcelType;

  @ApiPropertyOptional({ description: 'Processing status', enum: ExcelStatus, example: ExcelStatus.PENDING })
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

  @ApiPropertyOptional({ description: 'Number of successfully processed rows', example: 95 })
  @IsOptional()
  @IsNumber()
  successRows?: number;

  @ApiPropertyOptional({ description: 'Number of rows with errors', example: 5 })
  @IsOptional()
  @IsNumber()
  errorRows?: number;

  @ApiPropertyOptional({ description: 'Error message if processing failed', example: 'Invalid data in row 15' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Column headers', example: ['name', 'email', 'department'] })
  @IsOptional()
  columns?: string[];

  @ApiPropertyOptional({ description: 'Related project ID', example: '64a7b1c2d3e4f5a6b7c8d9e1' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  relatedProject?: string;

  @ApiPropertyOptional({ description: 'Related leave request ID', example: '64a7b1c2d3e4f5a6b7c8d9e2' })
  @IsOptional()
  @IsString()
  @IsMongoId()
  relatedLeave?: string;
}