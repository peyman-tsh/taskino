import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../../user/schemas/user.schema';
import { SupervisorMemberProfile } from '../services/supervisor-member.types';

@Injectable()
export class SupervisorMemberRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findMembersByIds(
    memberIds: Types.ObjectId[],
    page: number,
    limit: number,
  ): Promise<{ members: SupervisorMemberProfile[]; total: number }> {
    const filter = {
      _id: { $in: memberIds },
      roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
    };
    const [members, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          'firstName lastName email mobile roles isActive score progressPercentage performanceStatus performanceEvaluatedAt',
        )
        .sort({ firstName: 1, lastName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      members: members as unknown as SupervisorMemberProfile[],
      total,
    };
  }
}
