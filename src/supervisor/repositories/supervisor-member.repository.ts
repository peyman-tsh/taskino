import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../../user/schemas/user.schema';
import { SupervisorMemberProfile } from '../services/supervisor-member.types';
import { WorkField } from '../../common/enums/work-field.enum';

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

  async findSupervisorWorkField(
    supervisorId: Types.ObjectId,
  ): Promise<WorkField | null> {
    const supervisor = await this.userModel
      .findOne({ _id: supervisorId, roles: UserRole.SUPERVISOR })
      .select('workField')
      .lean()
      .exec();

    return supervisor?.workField ?? null;
  }

  async findSpecialistsByWorkField(
    workField: WorkField,
    page: number,
    limit: number,
  ) {
    const filter = {
      roles: UserRole.SPECIALIST,
      workField,
      isActive: true,
    };
    const [specialists, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          'firstName lastName email mobile roles workField isActive score progressPercentage performanceStatus',
        )
        .sort({ firstName: 1, lastName: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return { specialists, total };
  }
}
