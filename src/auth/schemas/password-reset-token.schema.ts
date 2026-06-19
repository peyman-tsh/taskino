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

  @Prop({ type: Number, default: 0 })
  failedAttempts: number;

  @Prop({ type: Date, default: null })
  verifiedAt?: Date | null;

  @Prop({ type: String, default: null, index: true })
  resetTokenHash?: string | null;

  @Prop({ type: Date, default: null })
  resetTokenExpiresAt?: Date | null;

  @Prop({ type: Date, default: null })
  usedAt?: Date | null;
}

export type PasswordResetTokenDocument =
  HydratedDocument<PasswordResetToken>;

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
