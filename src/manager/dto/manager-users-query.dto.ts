import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../user/schemas/user.schema';
import { PaginationQueryDto } from './pagination-query.dto';

export class ManagerUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter users by active status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter users by role',
    enum: UserRole,
    example: UserRole.SPECIALIST,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
