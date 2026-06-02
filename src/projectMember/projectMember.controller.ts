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
} from '@nestjs/common';
import { ProjectMemberService } from './projectMember.service';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { ProjectMemberRole } from './member.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('ProjectMembers')
@ApiBearerAuth()
@Controller('project-members')
export class ProjectMemberController {
  constructor(private readonly projectMemberService: ProjectMemberService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new project member',
    description: 'Adds a user as a member to a project',
  })
  @ApiResponse({ status: 201, description: 'Project member created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or already a member' })
  create(@Body() createProjectMemberDto: CreateProjectMemberDto) {
    return this.projectMemberService.create(createProjectMemberDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all project members',
    description: 'Returns a paginated list of all project members with optional filters',
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
  @ApiQuery({
    name: 'project',
    required: false,
    type: String,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by member role (manager, member, viewer)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({ status: 200, description: 'Project members retrieved successfully' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('project') project?: string,
    @Query('user') user?: string,
    @Query('role') role?: ProjectMemberRole,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.projectMemberService.findAll(page, limit, { project, user, role, isActive });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get project member by ID',
    description: 'Returns a single project member by its ID',
  })
  @ApiParam({ name: 'id', description: 'Project member ID' })
  @ApiResponse({ status: 200, description: 'Project member retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project member not found' })
  findOne(@Param('id') id: string) {
    return this.projectMemberService.findById(id);
  }

  @Get('project/:projectId')
  @ApiOperation({
    summary: 'Get project members by project',
    description: 'Returns all active members of a specific project',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Project members retrieved successfully' })
  findByProject(@Param('projectId') projectId: string) {
    return this.projectMemberService.findByProject(projectId);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get project members by user',
    description: 'Returns all active projects a user is a member of',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Project members retrieved successfully' })
  findByUser(@Param('userId') userId: string) {
    return this.projectMemberService.findByUser(userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update project member',
    description: 'Updates an existing project member by its ID',
  })
  @ApiParam({ name: 'id', description: 'Project member ID' })
  @ApiResponse({ status: 200, description: 'Project member updated successfully' })
  @ApiResponse({ status: 404, description: 'Project member not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  update(@Param('id') id: string, @Body() updateProjectMemberDto: UpdateProjectMemberDto) {
    return this.projectMemberService.update(id, updateProjectMemberDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete project member',
    description: 'Deletes a project member by its ID',
  })
  @ApiParam({ name: 'id', description: 'Project member ID' })
  @ApiResponse({ status: 204, description: 'Project member deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project member not found' })
  remove(@Param('id') id: string) {
    return this.projectMemberService.delete(id);
  }

  @Delete(':projectId/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove member from project',
    description: 'Removes a user from a project (soft delete)',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 404, description: 'Project member not found' })
  removeMember(@Param('projectId') projectId: string, @Param('userId') userId: string) {
    return this.projectMemberService.removeMember(projectId, userId);
  }

  @Get(':projectId/members/:userId/role')
  @ApiOperation({
    summary: 'Get member role',
    description: 'Returns the role of a user in a specific project',
  })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Member role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project member not found' })
  getMemberRole(@Param('projectId') projectId: string, @Param('userId') userId: string) {
    return this.projectMemberService.getMemberRole(projectId, userId);
  }
}