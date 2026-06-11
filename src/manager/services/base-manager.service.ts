import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class BaseManagerService {
  protected toObjectId(id: string, label = 'ID'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return new Types.ObjectId(id);
  }

  protected getPagination(query: PaginationQueryDto): {
    page: number;
    limit: number;
    skip: number;
  } {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }
}
