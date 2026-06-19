import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './services/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IncreaseScoreDto } from './dto/increase-score.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UserRole } from './schemas/user.schema';
import { JwtAuthGuard } from 'src/auth/guard/jwt.guard';
import {
  ApproveUserResponseDto,
  PaginatedUsersResponseDto,
  SpecialistProgressResponseDto,
  UserWorkSummaryResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user with the provided information',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Returns a paginated list of all users',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: PaginatedUsersResponseDto,
  })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.userService.findAll(Number(page), Number(limit));
  }

  @Get('me/progress')
  @Roles(UserRole.SPECIALIST, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Get current specialist or supervisor progress percentage',
    description:
      'Recalculates and returns progressPercentage for the authenticated specialist or supervisor.',
  })
  @ApiResponse({
    status: 200,
    description: 'User progress retrieved successfully',
    type: SpecialistProgressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Specialist or supervisor not found' })
  getMyProgress(@CurrentUserId() userId: string) {
    return this.userService.getSpecialistProgress(userId);
  }

  @Get('me/work-summary')
  @Roles(UserRole.SPECIALIST)
  @ApiOperation({
    summary: 'Get current specialist work summary',
    description:
      'Returns task count, completed task count, fixed task count, completed fixed task count, and score for the authenticated specialist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Specialist work summary retrieved successfully',
    type: UserWorkSummaryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  getMyWorkSummary(@CurrentUserId() userId: string) {
    return this.userService.getMyWorkSummary(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Returns a single user by their ID',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user by their ID',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Deletes a user by their ID',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.userService.delete(id);
  }
  @Patch(':id/approve')
  @ApiResponse({
    status: 200,
    description: 'User approved successfully',
    type: ApproveUserResponseDto,
  })
  async approveUser(@Param('id') id: string) {
    return await this.userService.approveExpert(id);
  }

  @Post('increase-score')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Increase user score',
    description: 'Increases a user score by the specified amount',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Score increased successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async increaseScore(@Body() increaseScoreDto: IncreaseScoreDto) {
    return await this.userService.increaseScore(increaseScoreDto);
  }
}
