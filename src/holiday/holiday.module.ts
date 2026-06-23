import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HolidayController } from './holiday.controller';
import { Holiday, HolidaySchema } from './holiday.schema';
import { HolidayRepository } from './repositories/holiday.repository';
import { HolidayService } from './services/holiday.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Holiday.name, schema: HolidaySchema },
    ]),
  ],
  controllers: [HolidayController],
  providers: [HolidayRepository, HolidayService],
  exports: [HolidayService],
})
export class HolidayModule {}
