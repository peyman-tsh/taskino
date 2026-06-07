import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkField } from '../../common/enums/work-field.enum';
import { UserRole } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  mobile?: string;

  @ApiProperty({ enum: UserRole })
  roles: UserRole;

  @ApiProperty({ enum: WorkField })
  workField: WorkField;

  @ApiProperty({ example: 0 })
  score: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

export class ApproveUserResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
