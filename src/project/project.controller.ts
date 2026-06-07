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
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from './project.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  PaginatedProjectsResponseDto,
  ProjectProgressResponseDto,
  ProjectResponseDto,
} from './dto/project-response.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../user/roles.guard';
import { Roles } from '../user/roles.decorator';
import { UserRole } from '../user/schemas/user.schema';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new project',
    description: 'Creates a new project with the provided information',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectService.create(createProjectDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all projects',
    description:
      'Returns a paginated list of all projects with optional filters',
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
    name: 'owner',
    required: false,
    type: String,
    description: 'Filter by owner user ID',
  })
  @ApiQuery({
    name: 'assignee',
    required: false,
    type: String,
    description: 'Filter by assigned specialist user ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by project status (pending, in_progress, completed)',
  })
  @ApiQuery({
    name: 'isArchived',
    required: false,
    type: Boolean,
    description: 'Filter by archive status',
  })
  @ApiQuery({
    name: 'isPublic',
    required: false,
    type: Boolean,
    description:
      'Filter public projects without an assignee or private assigned projects',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: PaginatedProjectsResponseDto,
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('owner') owner?: string,
    @Query('assignee') assignee?: string,
    @Query('status') status?: ProjectStatus,
    @Query('isArchived') isArchived?: boolean,
    @Query('isPublic') isPublic?: boolean,
  ) {
    return this.projectService.findAll(page, limit, {
      owner,
      assignee,
      status,
      isArchived,
      isPublic,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get project by ID',
    description: 'Returns a single project by its ID',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  findOne(@Param('id') id: string) {
    return this.projectService.findById(id);
  }

  @Get('owner/:ownerId')
  @ApiOperation({
    summary: 'Get projects by owner',
    description: 'Returns all projects owned by a specific user',
  })
  @ApiParam({ name: 'ownerId', description: 'Owner user ID' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: [ProjectResponseDto],
  })
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.projectService.findByOwner(ownerId);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update project',
    description: 'Updates an existing project by its ID',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete project',
    description: 'Deletes a project by its ID',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  remove(@Param('id') id: string) {
    return this.projectService.delete(id);
  }

  @Patch(':id/tasks/:taskId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({
    summary: 'Add task to project',
    description: 'Adds a task to the project',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task added successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  addTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.projectService.addTask(id, taskId);
  }

  @Delete(':id/tasks/:taskId')
  @Roles(UserRole.MANAGER)
  @ApiOperation({
    summary: 'Remove task from project',
    description: 'Removes a task from the project',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task removed successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  removeTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.projectService.removeTask(id, taskId);
  }

  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get project progress',
    description:
      'Returns the progress percentage of a project based on task completion',
  })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project progress retrieved successfully',
    type: ProjectProgressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Invalid project ID' })
  getProgress(@Param('id') id: string) {
    return this.projectService.getProgress(id);
  }
}
