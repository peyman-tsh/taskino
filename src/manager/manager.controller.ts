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
  WorkStatusRangeResponseDto,
  UserWorkStatusSummaryResponseDto,
  FixedTaskDocumentListResponseDto,
  FixedTaskStatusDocumentListResponseDto,
  FixedTaskDurationBalanceResponseDto,
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
import { WorkStatusRangeQueryDto } from './dto/work-status-range-query.dto';
import { FixedTaskTimingApprovalDto } from './dto/fixed-task-timing-approval.dto';
import { FixedTaskDurationBalanceQueryDto } from './dto/fixed-task-duration-balance-query.dto';
import { PaginatedTasksResponseDto } from '../task/dto/task-response.dto';
import { FixedTaskUserFilterQueryDto } from './dto/fixed-task-user-filter-query.dto';

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
  @Roles(UserRole.SUPERVISOR)
  @Patch('fixed-tasks/:id/timing-approval')
  @ApiOperation({
    summary: 'Approve or reject a completed fixed-task timing',
    description:
      'Approved timing is inherited by future occurrences. Rejected timing causes future occurrences to start with empty times.',
  })
  @ApiParam({ name: 'id', description: 'FixedTask ID' })
  @ApiOkResponse({ description: 'Fixed-task timing reviewed successfully' })
  reviewFixedTaskTiming(
    @Param() params: MongoIdParamDto,
    @CurrentUserId() managerId: string,
    @Body() dto: FixedTaskTimingApprovalDto,
  ) {
    return this.managerService.reviewFixedTaskTiming(
      params.id,
      managerId,
      dto.status,
      dto.approvedDurationMinutes,
      dto.taskComment,
    );
  }

  @Get('tasks/status')
  @ApiOperation({ summary: 'Get task status overview' })
  @ApiOkResponse({ type: TaskStatusOverviewResponseDto })
  getTaskStatusOverview() {
    return this.managerService.getTaskStatusOverview();
  }

  @Get('tasks/status-range')
  @ApiOperation({
    summary: 'Get regular and fixed task status counts for a date range',
    description:
      'Returns mutually exclusive done, in-progress, todo, and overdue unfinished counts, including separate Task and FixedTask breakdowns.',
  })
  @ApiOkResponse({
    description: 'Date-range work status counts retrieved successfully',
    type: WorkStatusRangeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid date range' })
  getWorkStatusCounts(
    @CurrentUserId() managerId: string,
    @Query() query: WorkStatusRangeQueryDto,
  ) {
    return this.managerService.getWorkStatusCounts(
      managerId,
      query.from,
      query.to,
    );
  }

  @Get('users/work-status-summary')
  @ApiOperation({
    summary: 'Get per-user task and fixed-task status counts for a date range',
    description:
      'Groups regular Task and FixedTask counts by assigned user, or returns one user when userId is provided. Records are included when their start/end/due date overlaps the selected range. FixedTask done, todo, and in-progress counts only include isActive=true records; expired unfinished FixedTasks only include isActive=false records.',
  })
  @ApiOkResponse({
    description: 'Per-user work status summary retrieved successfully',
    type: UserWorkStatusSummaryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid date range' })
  getUserWorkStatusCounts(
    @CurrentUserId() managerId: string,
    @Query() query: WorkStatusRangeQueryDto,
  ) {
    return this.managerService.getUserWorkStatusCounts(
      managerId,
      query.from,
      query.to,
      query.userId,
    );
  }

  @Get('fixed-tasks/overdue')
  @ApiOperation({
    summary: 'Get overdue fixed-task documents',
    description:
      'Returns overdue FixedTask documents in the selected date range. When userId is provided, only that user is returned; otherwise all users are included.',
  })
  @ApiOkResponse({
    description: 'Overdue fixed tasks retrieved successfully',
    type: FixedTaskDocumentListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid date range or user ID' })
  getOverdueFixedTasks(
    @CurrentUserId() managerId: string,
    @Query() query: WorkStatusRangeQueryDto,
  ) {
    return this.managerService.getOverdueFixedTasks(
      managerId,
      query.from,
      query.to,
      query.userId,
    );
  }

  @Get('fixed-tasks/done')
  @ApiOperation({
    summary: 'Get done fixed-task documents',
    description:
      'Returns completed FixedTask documents in the selected date range. When userId is provided, only that user is returned; otherwise all users are included.',
  })
  @ApiOkResponse({
    description: 'Done fixed tasks retrieved successfully',
    type: FixedTaskDocumentListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid date range or user ID' })
  getDoneFixedTasks(
    @CurrentUserId() managerId: string,
    @Query() query: WorkStatusRangeQueryDto,
  ) {
    return this.managerService.getDoneFixedTasks(
      managerId,
      query.from,
      query.to,
      query.userId,
    );
  }

  @Get('fixed-tasks/in-progress')
  @ApiOperation({
    summary: 'Get active in-progress fixed-task documents',
    description:
      'Returns active FixedTask documents with status in_progress. When userId is provided, only that assigned user is returned; otherwise all users are included.',
  })
  @ApiOkResponse({
    description: 'In-progress fixed tasks retrieved successfully',
    type: FixedTaskStatusDocumentListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
  getInProgressFixedTasks(@Query() query: FixedTaskUserFilterQueryDto) {
    return this.managerService.getInProgressFixedTasks(query.userId);
  }

  @Get('fixed-tasks/todo')
  @ApiOperation({
    summary: 'Get active todo fixed-task documents',
    description:
      'Returns active FixedTask documents with status todo. When userId is provided, only that assigned user is returned; otherwise all users are included.',
  })
  @ApiOkResponse({
    description: 'Todo fixed tasks retrieved successfully',
    type: FixedTaskStatusDocumentListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
  getTodoFixedTasks(@Query() query: FixedTaskUserFilterQueryDto) {
    return this.managerService.getTodoFixedTasks(query.userId);
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

  @Get('extra-tasks')
  @ApiOperation({
    summary: 'Get all extra tasks',
    description:
      'Returns a paginated list of all extra tasks created by specialists.',
  })
  @ApiOkResponse({
    description: 'Extra tasks retrieved successfully',
    type: PaginatedTasksResponseDto,
  })
  findAllExtraTasks(@Query() query: PaginationQueryDto) {
    return this.managerService.findAllExtraTasks(query);
  }

  @Get('fixed-tasks/daily-duration-balance')
  @ApiOperation({
    summary: 'Get daily fixed-task duration balance',
    description:
      'Sums actualDurationMinutes for done daily FixedTasks in a date range and subtracts the total from 8 hours.',
  })
  @ApiOkResponse({
    description: 'Daily fixed-task duration balance retrieved successfully',
    type: FixedTaskDurationBalanceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid date range or user ID' })
  getDailyFixedTaskDurationBalance(
    @Query() query: FixedTaskDurationBalanceQueryDto,
  ) {
    return this.managerService.getDailyFixedTaskDurationBalance(
      query.from,
      query.to,
      query.userId,
    );
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
