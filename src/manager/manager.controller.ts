import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
import { SetProjectActivationDto } from './dto/set-project-activation.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from '../user/schemas/user.schema';

@ApiTags('Manager')
@ApiBearerAuth()
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('statistics')
  @ApiOperation({
    summary: 'Get manager dashboard statistics',
    description: 'Returns active projects count, open tasks count, and active users count',
  })
  @ApiOkResponse({ description: 'Manager statistics retrieved successfully' })
  getStatistics() {
    return this.managerService.getDashboardStatistics();
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get users list',
    description: 'Returns paginated users with optional role and active status filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'role', required: false, enum: UserRole, description: 'Filter by user role' })
  @ApiOkResponse({ description: 'Users retrieved successfully' })
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
  @ApiOkResponse({ description: 'User role updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid user ID or role' })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateUserRole(@Param() params: MongoIdParamDto, @Body() dto: UpdateUserRoleDto) {
    return this.managerService.updateUserRole(params.id, dto.role);
  }

  @Patch('projects/:id/activation')
  @ApiOperation({
    summary: 'Activate or deactivate project',
    description: 'Sets project active state by updating its archive status',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({ description: 'Project activation updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid project ID or body' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  setProjectActivation(@Param() params: MongoIdParamDto, @Body() dto: SetProjectActivationDto) {
    return this.managerService.setProjectActivation(params.id, dto.isActive);
  }

  @Get('projects/:id/members')
  @ApiOperation({
    summary: 'Get project members',
    description: 'Returns members of a project with member roles and active status',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({ description: 'Project members retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProjectMembers(@Param() params: MongoIdParamDto) {
    return this.managerService.getProjectMembers(params.id);
  }

  @Get('projects/:id/progress')
  @ApiOperation({
    summary: 'Get project progress',
    description: 'Returns project task progress by total, done, in progress, and todo tasks',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiOkResponse({ description: 'Project progress retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProjectProgress(@Param() params: MongoIdParamDto) {
    return this.managerService.getProjectProgress(params.id);
  }
}
