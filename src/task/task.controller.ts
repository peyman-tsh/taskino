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
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TaskService } from './services/task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskCompletionStatsDto } from './dto/task-count.dto';
import { DateCountDto } from './dto/dateCount.dto';
import { TaskRecurrence, TaskStatus } from './task.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import {
  PaginatedTasksResponseDto,
  TaskCompletionStatsResponseDto,
  TaskDateCountResponseDto,
  TaskResponseDto,
} from './dto/task-response.dto';
import { RolesGuard } from '../user/roles.guard';
import { Roles } from '../user/roles.decorator';
import { UserRole } from '../user/schemas/user.schema';
import { Public } from '../auth/decorators/public.decorator';
import { SpecialistTaskQueryService } from './services/specialist-task-query.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly specialistTaskQueryService: SpecialistTaskQueryService,
  ) {}

  @Post()
  @Roles(UserRole.MANAGER, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new task',
    description: 'Creates an independent task assigned to exactly one user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    createTaskDto: CreateTaskDto,
    @UploadedFile() file?: Express.Multer.File,
    @Request() request?: { user: { userId: string } },
  ) {
    return this.taskService.create(
      {
        ...createTaskDto,
        createdBy: request!.user.userId,
      },
      file,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all tasks',
    description: 'Returns a paginated list of all tasks with optional filters',
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
    name: 'createdBy',
    required: false,
    type: String,
    description: 'Filter by creator user ID',
  })
  @ApiQuery({
    name: 'assignedTo',
    required: false,
    type: String,
    description: 'Filter by assigned user ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by task status (todo, in_progress, done)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description:
      'Range start as ISO date-time. Returns tasks whose dueDate is on or after this value.',
    example: '2026-06-07T00:00:00+03:30',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description:
      'Range end as ISO date-time. Returns tasks whose startDate is on or before this value.',
    example: '2026-06-07T23:59:59+03:30',
  })
  @ApiQuery({
    name: 'recurrence',
    required: false,
    enum: TaskRecurrence,
    description: 'Filter by daily, weekly, or monthly recurrence',
    example: TaskRecurrence.WEEKLY,
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: PaginatedTasksResponseDto,
  })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('createdBy') createdBy?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('status') status?: TaskStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('recurrence') recurrence?: TaskRecurrence,
  ) {
    return this.taskService.findAll(page, limit, {
      createdBy,
      assignedTo,
      status,
      startDate,
      endDate,
      recurrence,
    });
  }


  @Get('user')
  @ApiOperation({
    summary: 'Get tasks by user name',
    description: 'Returns tasks assigned to a user by their name',
  })
  @ApiParam({ name: 'userName', description: 'User name' })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
    type: [TaskResponseDto],
  })
  getUserTasksByName(@Query('userName') userName: string, @Query('lastName') lastName: string) {
    return this.taskService.getUserTasksByName(userName, lastName);
  }

  @Get('specialist/:userId')
  @Public()
  @ApiOperation({ summary: 'Get tasks assigned to a specialist' })
  @ApiParam({ name: 'userId', description: 'Specialist user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedTasksResponseDto })
  getSpecialistTasks(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.specialistTaskQueryService.findBySpecialist(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task by ID',
    description: 'Returns a single task by its ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string) {
    return this.taskService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update task',
    description: 'Updates an existing task by its ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.taskService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete task',
    description: 'Deletes a task by its ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(@Param('id') id: string) {
    return this.taskService.delete(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update task status',
    description: 'Updates the status of a task by its ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task status updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
  ) {
    return this.taskService.updateStatus(id, updateTaskStatusDto.status);
  }

  @Post('completion-stats')
  @Roles(UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get task completion statistics',
    description:
      'Returns the number of completed and pending tasks that a manager assigned to an expert',
  })
  @ApiResponse({
    status: 200,
    description: 'Task completion statistics retrieved successfully',
    type: TaskCompletionStatsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  getTaskCompletionStats(@Body() statsDto: TaskCompletionStatsDto) {
    return this.taskService.getTaskCompletionStats(statsDto);
  }

  @Post('date-count')
  @Roles(UserRole.MANAGER, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get task count by user and date range',
    description: 'Returns task statistics for a user within a date range',
  })
  @ApiResponse({
    status: 200,
    description: 'Task count retrieved successfully',
    type: TaskDateCountResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  findTasksByUserAndCount(@Body() dateCountDto: DateCountDto) {
    return this.taskService.findTasksByUserAndCount(dateCountDto);
  }
}
