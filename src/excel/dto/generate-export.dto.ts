import { IsArray, IsOptional, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateExportDto {
  @ApiProperty({
    description: 'Array of data objects to export',
    example: [
      { name: 'John Doe', email: 'john@example.com', department: 'Engineering' },
      { name: 'Jane Smith', email: 'jane@example.com', department: 'Marketing' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
  data: Record<string, unknown>[];

  @ApiPropertyOptional({
    description: 'Column headers to include in export',
    example: ['name', 'email', 'department'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional({
    description: 'Sheet name for the export',
    example: 'Export Data',
    default: 'Export',
  })
  @IsOptional()
  @IsString()
  sheetName?: string = 'Export';
}
