import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { Roles } from '../user/roles.decorator';
import { RolesGuard } from '../user/roles.guard';
import { UserRole } from '../user/schemas/user.schema';
import { ManagerUsersQueryDto } from './dto/manager-users-query.dto';
import {
  ManagerStatisticsResponseDto,
  ManagerAllTasksResponseDto,
  MonthlyUserPerformanceResponseDto,
  PaginatedUsersResponseDto,
  UserProgressResponseDto,
  TaskCountsByUserResponseDto,
  TaskStatusOverviewResponseDto,
  UserResponseDto,
} from './dto/manager-response.dto';
import { MongoIdParamDto } from './dto/mongo-id-param.dto';
import { MonthlyPerformanceQueryDto } from './dto/monthly-performance-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ManagerService } from './services/manager.service';
import { ManagerTasksQueryDto } from './dto/manager-tasks-query.dto';
import { FindUserByNameQueryDto } from './dto/find-user-by-name-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { AdjustSpecialistScoreDto } from './dto/adjust-specialist-score.dto';
import { ManagerUserScoreService } from './services/manager-user-score.service';

@ApiTags('Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('manager')
export class ManagerController {
  constructor(
    private readonly managerService: ManagerService,
    private readonly managerUserScoreService: ManagerUserScoreService,
  ) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get manager dashboard statistics' })
  @ApiOkResponse({ type: ManagerStatisticsResponseDto })
  getStatistics() {
    return this.managerService.getDashboardStatistics();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get users list' })
  @ApiOkResponse({ type: PaginatedUsersResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findUsers(@Query() query: ManagerUsersQueryDto) {
    return this.managerService.findUsers(query);
  }

  @Get('users/by-name')
  @ApiOperation({
    summary: 'Find one user by first name and last name',
    description:
      'Returns the user whose firstName and lastName exactly match the provided query values.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  findUserByName(@Query() query: FindUserByNameQueryDto) {
    return this.managerService.findUserByName(query.firstName, query.lastName);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Change user role' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid user ID or role' })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateUserRole(
    @Param() params: MongoIdParamDto,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.managerService.updateUserRole(params.id, dto.role);
  }

  @Patch('users/:id/score')
  @ApiOperation({
    summary: 'Manually adjust a specialist score',
    description:
      'Adds or subtracts a score selected by the manager. This operation is separate from automatic task scoring, and the final score cannot be less than zero.',
  })
  @ApiParam({ name: 'id', description: 'Specialist user ID' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Score must be a non-zero integer' })
  @ApiNotFoundResponse({ description: 'Specialist user not found' })
  adjustSpecialistScore(
    @Param() params: MongoIdParamDto,
    @Body() dto: AdjustSpecialistScoreDto,
  ) {
    return this.managerUserScoreService.adjustSpecialistScore(
      params.id,
      dto.score,
    );
  }

  @Get('tasks/status')
  @ApiOperation({ summary: 'Get task status overview' })
  @ApiOkResponse({ type: TaskStatusOverviewResponseDto })
  getTaskStatusOverview() {
    return this.managerService.getTaskStatusOverview();
  }

  @Get('tasks/users/counts')
  @ApiOperation({ summary: 'Get task counts by user' })
  @ApiOkResponse({ type: [TaskCountsByUserResponseDto] })
  getTaskCountsByUsers() {
    return this.managerService.getTaskCountsByUsers();
  }

  @Get('tasks')
  @ApiOperation({
    summary: 'Get all regular and fixed tasks',
    description:
      'Returns all Task and FixedTask records with an optional daily, weekly, or monthly recurrence filter.',
  })
  @ApiOkResponse({ type: ManagerAllTasksResponseDto })
  getAllTasks(@Query() query: ManagerTasksQueryDto) {
    return this.managerService.findAllTasks(query);
  }

  @Get('leave-requests')
  @ApiOperation({ summary: 'Get all employee leave requests' })
  @ApiOkResponse({ description: 'Leave requests retrieved successfully' })
  getAllLeaveRequests(@Query() query: PaginationQueryDto) {
    return this.managerService.findAllLeaveRequests(query);
  }

  @Patch('leave-requests/:id/approve')
  @ApiOperation({ summary: 'Approve an employee leave request by manager' })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiOkResponse({ description: 'Leave request approved by manager' })
  @ApiNotFoundResponse({ description: 'Leave request not found' })
  approveLeaveRequest(
    @Param() params: MongoIdParamDto,
    @CurrentUserId() managerId: string,
  ) {
    return this.managerService.approveLeaveRequest(params.id, managerId);
  }

  @Get('users/monthly-performance')
  @ApiOperation({ summary: 'Get monthly user performance' })
  @ApiOkResponse({ type: MonthlyUserPerformanceResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  getMonthlyUserPerformance(@Query() query: MonthlyPerformanceQueryDto) {
    return this.managerService.getMonthlyUserPerformance(query);
  }

  @Get('users/progress')
  @Roles(UserRole.MANAGER, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Evaluate specialist and supervisor progress',
    description:
      'Calculates weighted progress, stores good/normal/weak performance in the database, and returns the result.',
  })
  @ApiOkResponse({ type: [UserProgressResponseDto] })
  evaluateUserProgress() {
    return this.managerService.evaluateUserProgress();
  }
}
