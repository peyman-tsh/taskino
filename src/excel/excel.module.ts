import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExcelService } from './services/excel.service';
import { ExcelController } from './excel.controller';
import { ExcelFile, ExcelSchema } from './excel.schema';
import { NodeFileSystem } from './file-system.provider';
import { ExcelWorkbookService } from './services/excel-workbook.service';
import { ExcelRepository } from './repositories/excel.repository';
import { ExcelStorageService } from './services/excel-storage.service';
import { ExcelUploadService } from './services/excel-upload.service';
import { ExcelImportService } from './services/excel-import.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExcelFile.name, schema: ExcelSchema },
    ]),
  ],
  controllers: [ExcelController],
  providers: [
    ExcelService,
    ExcelWorkbookService,
    ExcelRepository,
    ExcelStorageService,
    ExcelUploadService,
    ExcelImportService,
    {
      provide: NodeFileSystem.name,
      useClass: NodeFileSystem,
    },
  ],
  exports: [ExcelService],
})
export class ExcelModule {}
