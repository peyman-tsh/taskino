import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExcelService } from './excel.service';
import { ExcelController } from './excel.controller';
import { ExcelFile, ExcelSchema } from './excel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExcelFile.name, schema: ExcelSchema },
    ]),
  ],
  controllers: [ExcelController],
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}