import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ type: Date, required: true, index: { expires: 0 } })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  usedAt?: Date | null;
}

export type PasswordResetTokenDocument =
  HydratedDocument<PasswordResetToken>;

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
