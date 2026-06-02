import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExcelService } from './excel.service';
import { ExcelController } from './excel.controller';
import { ExcelFile, ExcelSchema } from './excel.schema';
import { NodeFileSystem } from './file-system.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExcelFile.name, schema: ExcelSchema },
    ]),
  ],
  controllers: [ExcelController],
  providers: [
    ExcelService,
    {
      provide: NodeFileSystem.name,
      useClass: NodeFileSystem,
    },
  ],
  exports: [ExcelService],
})
export class ExcelModule {}
