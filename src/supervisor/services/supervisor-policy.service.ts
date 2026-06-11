import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class SupervisorPolicyService {
  toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supervisor ID');
    }

    return new Types.ObjectId(id);
  }
}
