import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExcelService } from './excel.service';
import { CreateExcelDto } from './dto/create-excel.dto';
import { UpdateExcelDto } from './dto/update-excel.dto';
import { GenerateExportDto } from './dto/generate-export.dto';
import { ExcelType, ExcelStatus } from './excel.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import * as multer from 'multer';

@ApiTags('Excel')
@Controller('excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new Excel record',
    description: 'Creates a new Excel record with the provided information',
  })
  @ApiResponse({ status: 201, description: 'Excel record created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() createExcelDto: CreateExcelDto) {
    return this.excelService.create(createExcelDto);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload Excel file',
    description: 'Uploads an Excel file and creates a record',
  })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'createdBy',
    required: true,
    description: 'ID of the user who uploaded the file',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ExcelType,
    description: 'Type of Excel operation (import/export)',
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Query('createdBy') createdBy: string,
    @Query('type') type: ExcelType = ExcelType.IMPORT,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.excelService.uploadFile(file, createdBy, type);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all Excel records',
    description: 'Returns a paginated list of all Excel records with optional filters',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: String,
    description: 'Filter by creator user ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ExcelStatus,
    description: 'Filter by status (pending, processing, completed, failed)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ExcelType,
    description: 'Filter by type (import, export)',
  })
  @ApiResponse({ status: 200, description: 'Excel records retrieved successfully' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('createdBy') createdBy?: string,
    @Query('status') status?: ExcelStatus,
    @Query('type') type?: ExcelType,
  ) {
    return this.excelService.findAll(page, limit, { createdBy, status, type });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Excel record by ID',
    description: 'Returns a single Excel record by its ID',
  })
  @ApiParam({ name: 'id', description: 'Excel record ID' })
  @ApiResponse({ status: 200, description: 'Excel record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Excel record not found' })
  findOne(@Param('id') id: string) {
    return this.excelService.findById(id);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download Excel file',
    description: 'Downloads the physical Excel file by record ID',
  })
  @ApiParam({ name: 'id', description: 'Excel record ID' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const excelFile = await this.excelService.getFile(id);
    const fs = require('fs');
    const fileStream = fs.createReadStream(excelFile.filePath);
    res.setHeader('Content-Type', excelFile.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${excelFile.originalName || excelFile.fileName}"`,
    );
    fileStream.pipe(res);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update Excel record',
    description: 'Updates an existing Excel record by its ID',
  })
  @ApiParam({ name: 'id', description: 'Excel record ID' })
  @ApiResponse({ status: 200, description: 'Excel record updated successfully' })
  @ApiResponse({ status: 404, description: 'Excel record not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  update(@Param('id') id: string, @Body() updateExcelDto: UpdateExcelDto) {
    return this.excelService.update(id, updateExcelDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete Excel record',
    description: 'Deletes an Excel record and its physical file by ID',
  })
  @ApiParam({ name: 'id', description: 'Excel record ID' })
  @ApiResponse({ status: 204, description: 'Excel record deleted successfully' })
  @ApiResponse({ status: 404, description: 'Excel record not found' })
  remove(@Param('id') id: string) {
    return this.excelService.delete(id);
  }

  @Post(':id/process')
  @ApiOperation({
    summary: 'Process imported Excel file',
    description: 'Processes an imported Excel file and updates row statistics',
  })
  @ApiParam({ name: 'id', description: 'Excel record ID' })
  @ApiResponse({ status: 200, description: 'Excel file processed successfully' })
  @ApiResponse({ status: 404, description: 'Excel record not found' })
  @ApiResponse({ status: 400, description: 'Not an import file' })
  processImport(@Param('id') id: string) {
    return this.excelService.processImport(id);
  }

  @Get('statistics/:userId')
  @ApiOperation({
    summary: 'Get Excel statistics',
    description: 'Returns statistics about Excel files for a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics(@Param('userId') userId: string) {
    return this.excelService.getStatistics(userId);
  }

  @Post('export/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate Excel export',
    description: 'Generates an Excel file from JSON data and returns the buffer',
  })
  @ApiConsumes('application/json')
  @ApiResponse({ status: 200, description: 'Excel file generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async generateExport(
    @Body() generateExportDto: GenerateExportDto,
    @Res() res: Response,
  ) {
    const { data, columns, sheetName } = generateExportDto;
    const buffer = await this.excelService.generateExcelFromObjects(data, columns, sheetName || 'Export');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="export.xlsx"',
    );
    res.send(buffer);
  }
}