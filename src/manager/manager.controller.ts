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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ManagerService } from './manager.service';
import { ManagerUsersQueryDto } from './dto/manager-users-query.dto';
import { MongoIdParamDto } from './dto/mongo-id-param.dto';
import { MonthlyPerformanceQueryDto } from './dto/monthly-performance-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SetProjectActivationDto } from './dto/set-project-activation.dto';
import { TaskAnalyticsQueryDto } from './dto/task-analytics-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from '../user/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../user/roles.guard';
import { Roles } from '../user/roles.decorator';
import {
  ManagerProjectAssigneeResponseDto,
  ManagerStatisticsResponseDto,
  MonthlyUserPerformanceResponseDto,
  PaginatedProjectProgressResponseDto,
  PaginatedUsersResponseDto,
  ProjectActivationResponseDto,
  ProjectProgressResponseDto,
  TaskCountsByUserResponseDto,
  TaskStatusOverviewResponseDto,
  UserResponseDto,
} from './dto/manager-response.dto';

@ApiTags('Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('statistics')
  @ApiOperation({
    summary: 'Get manager dashboard statistics',
    description:
      'Returns active projects count, open tasks count, and active users count',
  })
  @ApiOkResponse({
    description: 'Manager statistics retrieved successfully',
    type: ManagerStatisticsResponseDto,
  })
  getStatistics() {
    return this.managerService.getDashboardStatistics();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get users list',
    description:
      'Returns paginated users with optional name, role, and active status filters',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Case-insensitive search in first name and last name',
  })
  @ApiOkResponse({
    description: 'Users retrieved successfully',
    type: PaginatedUsersResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findUsers(@Query() query: ManagerUsersQueryDto) {
    return this.managerService.findUsers(query);
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Change user role',
    description: 'Updates a user role to specialist, supervisor, or manager',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({
    description: 'User role updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid user ID or role' })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateUserRole(
    @Param() params: MongoIdParamDto,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.managerService.updateUserRole(params.id, dto.role);
  }

  @Patch('projects/:id/activation')
  @ApiOperation({
    summary: 'Activate or deactivate project',
    description: 'Sets project active state by updating its archive status',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({
    description: 'Project activation updated successfully',
    type: ProjectActivationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid project ID or body' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  setProjectActivation(
    @Param() params: MongoIdParamDto,
    @Body() dto: SetProjectActivationDto,
  ) {
    return this.managerService.setProjectActivation(params.id, dto.isActive);
  }

  @Get('projects/progress')
  @ApiOperation({
    summary: 'Get projects progress',
    description: 'Returns paginated progress percentages for projects',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiOkResponse({
    description: 'Projects progress retrieved successfully',
    type: PaginatedProjectProgressResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  getProjectsProgress(@Query() query: PaginationQueryDto) {
    return this.managerService.getProjectsProgress(query);
  }

  @Get('projects/:id/assignee')
  @ApiOperation({
    summary: 'Get project assignee',
    description: 'Returns the specialist responsible for the project',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({
    description: 'Project assignee retrieved successfully',
    type: ManagerProjectAssigneeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProjectAssignee(@Param() params: MongoIdParamDto) {
    return this.managerService.getProjectAssignee(params.id);
  }

  @Get('projects/:id/progress')
  @ApiOperation({
    summary: 'Get project progress',
    description:
      'Returns project task progress by total, done, in progress, and todo tasks',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({
    description: 'Project progress retrieved successfully',
    type: ProjectProgressResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProjectProgress(@Param() params: MongoIdParamDto) {
    return this.managerService.getProjectProgress(params.id);
  }

  @Get('tasks/status')
  @ApiOperation({
    summary: 'Get task status overview',
    description:
      'Returns total task counts grouped by todo, in progress, and done status',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project ID',
  })
  @ApiOkResponse({
    description: 'Task status overview retrieved successfully',
    type: TaskStatusOverviewResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  getTaskStatusOverview(@Query() query: TaskAnalyticsQueryDto) {
    return this.managerService.getTaskStatusOverview(query);
  }

  @Get('tasks/users/counts')
  @ApiOperation({
    summary: 'Get task counts by user',
    description: 'Returns task counts for each assigned user grouped by status',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project ID',
  })
  @ApiOkResponse({
    description: 'Task counts by user retrieved successfully',
    type: [TaskCountsByUserResponseDto],
  })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  getTaskCountsByUsers(@Query() query: TaskAnalyticsQueryDto) {
    return this.managerService.getTaskCountsByUsers(query);
  }

  @Get('users/monthly-performance')
  @ApiOperation({
    summary: 'Get monthly user performance',
    description: 'Returns monthly user task performance with user scores',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description: 'Month number from 1 to 12',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Full year',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project ID',
  })
  @ApiOkResponse({
    description: 'Monthly user performance retrieved successfully',
    type: MonthlyUserPerformanceResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  getMonthlyUserPerformance(@Query() query: MonthlyPerformanceQueryDto) {
    return this.managerService.getMonthlyUserPerformance(query);
  }
}
