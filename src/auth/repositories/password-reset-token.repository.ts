import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from '../schemas/password-reset-token.schema';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectModel(PasswordResetToken.name)
    private readonly model: Model<PasswordResetTokenDocument>,
  ) {}

  async replaceUserCode(
    userId: Types.ObjectId,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.model.deleteMany({ userId }).exec();
    await new this.model({
      userId,
      tokenHash: codeHash,
      expiresAt,
      failedAttempts: 0,
    }).save();
  }

  verifyCode(
    userId: Types.ObjectId,
    codeHash: string,
    resetTokenHash: string,
    resetTokenExpiresAt: Date,
    now: Date,
  ) {
    return this.model
      .findOneAndUpdate(
        {
          userId,
          tokenHash: codeHash,
          verifiedAt: null,
          usedAt: null,
          expiresAt: { $gt: now },
          failedAttempts: { $lt: 5 },
        },
        {
          $set: {
            verifiedAt: now,
            resetTokenHash,
            resetTokenExpiresAt,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  recordFailedAttempt(userId: Types.ObjectId, now: Date) {
    return this.model
      .updateOne(
        {
          userId,
          verifiedAt: null,
          usedAt: null,
          expiresAt: { $gt: now },
        },
        { $inc: { failedAttempts: 1 } },
      )
      .exec();
  }

  consumeVerifiedToken(resetTokenHash: string, now: Date) {
    return this.model
      .findOneAndUpdate(
        {
          resetTokenHash,
          verifiedAt: { $type: 'date' },
          usedAt: null,
          resetTokenExpiresAt: { $gt: now },
        },
        { $set: { usedAt: now } },
        { returnDocument: 'after' },
      )
      .exec();
  }
}
