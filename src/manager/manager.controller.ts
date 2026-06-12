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

@ApiTags('Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

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
