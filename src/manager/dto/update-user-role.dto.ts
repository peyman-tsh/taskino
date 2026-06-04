import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '../../user/schemas/user.schema';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'New user role',
    enum: UserRole,
    example: UserRole.SUPERVISOR,
  })
  @IsEnum(UserRole)
  role: UserRole;
}
