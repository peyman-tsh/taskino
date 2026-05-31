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
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from './task.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Tasks')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new task',
    description: 'Creates a new task with the provided information',
  })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.taskService.create(createTaskDto);
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
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('createdBy') createdBy?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.taskService.findAll(page, limit, { createdBy, assignedTo, status });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task by ID',
    description: 'Returns a single task by its ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string) {
    return this.taskService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update task',
    description: 'Updates an existing task by its ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.taskService.update(id, updateTaskDto);
  }

  @Delete(':id')
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
  @ApiOperation({
    summary: 'Update task status',
    description: 'Updates the status of a task by its ID',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  updateStatus(@Param('id') id: string, @Body('status') status: TaskStatus) {
    return this.taskService.updateStatus(id, status);
  }
}