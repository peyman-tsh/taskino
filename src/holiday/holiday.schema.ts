import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HolidayDocument = HydratedDocument<Holiday>;

@Schema({ timestamps: true })
export class Holiday {
  @Prop({ type: Date, required: true, unique: true, index: true })
  date: Date;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  jalaliDate: string;

  @Prop({ type: Number, required: true, index: true })
  jalaliYear: number;

  @Prop({ type: Boolean, default: true, index: true })
  isOfficial: boolean;

  @Prop({ type: String, default: 'calendar.ut.ac.ir' })
  source: string;
}

export const HolidaySchema = SchemaFactory.createForClass(Holiday);

HolidaySchema.index({ jalaliYear: 1, date: 1 });
