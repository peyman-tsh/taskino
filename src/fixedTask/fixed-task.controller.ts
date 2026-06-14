import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { Roles } from '../user/roles.decorator';
import { RolesGuard } from '../user/roles.guard';
import { UserRole } from '../user/schemas/user.schema';
import { CreateFixedTaskDto } from './dto/create-fixed-task.dto';
import { FixedTaskParamDto } from './dto/fixed-task-param.dto';
import { QueryFixedTaskDto } from './dto/query-fixed-task.dto';
import { UpdateFixedTaskDto } from './dto/update-fixed-task.dto';
import { FixedTaskService } from './services/fixed-task.service';
import {
  FixedTaskResponseDto,
  FixedTaskStatusCountsResponseDto,
  PaginatedFixedTasksResponseDto,
} from './dto/fixed-task-response.dto';
import { FixedTaskSeedService } from './services/fixed-task-seed.service';
import { Public } from '../auth/decorators/public.decorator';
import { SpecialistFixedTaskQueryService } from './services/specialist-fixed-task-query.service';

@ApiTags('Fixed Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.SUPERVISOR)
@Controller('fixed-tasks')
export class FixedTaskController {
  constructor(
    private readonly fixedTaskService: FixedTaskService,
    private readonly fixedTaskSeedService: FixedTaskSeedService,
    private readonly specialistFixedTaskQueryService: SpecialistFixedTaskQueryService,
  ) {}

  @Post('seed/excel')
  @Public()
  @ApiOperation({
    summary: 'Seed users and fixed tasks from the configured four-sheet Excel',
  })
  @ApiCreatedResponse({
    description: 'Users and fixed tasks seeded successfully',
  })
  seedFromExcel() {
    return this.fixedTaskSeedService.seed();
  }

  @Post()
  @ApiOperation({ summary: 'Create a fixed task template' })
  @ApiCreatedResponse({
    description: 'Fixed task template created successfully',
    type: FixedTaskResponseDto,
  })
  create(@CurrentUserId() creatorId: string, @Body() dto: CreateFixedTaskDto) {
    return this.fixedTaskService.create(creatorId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get fixed task templates with filters and pagination',
  })
  @ApiOkResponse({
    description: 'Fixed task templates retrieved successfully',
    type: PaginatedFixedTasksResponseDto,
  })
  findAll(@Query() query: QueryFixedTaskDto) {
    return this.fixedTaskService.findAll(query);
  }

  @Get('specialist/:userId')
  @Public()
  @ApiOperation({ summary: 'Get fixed tasks assigned to a specialist' })
  @ApiParam({ name: 'userId', description: 'Specialist user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedFixedTasksResponseDto })
  getSpecialistFixedTasks(
    @Param('userId') userId: string,
    @Query('page') page: number ,
    @Query('limit') limit: number ,
  ) {
    return this.specialistFixedTaskQueryService.findBySpecialist(
      userId,
      page,
      limit,
    );
  }

  @Get('status-counts')
  @ApiOperation({
    summary: 'Get fixed task counts grouped by status',
    description:
      'Returns total, waiting, in-progress, and completed fixed task counts.',
  })
  @ApiOkResponse({
    description: 'Fixed task status counts retrieved successfully',
    type: FixedTaskStatusCountsResponseDto,
  })
  getStatusCounts() {
    return this.fixedTaskService.getStatusCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one fixed task template' })
  @ApiOkResponse({
    description: 'Fixed task template retrieved successfully',
    type: FixedTaskResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Fixed task template not found' })
  findOne(@Param() params: FixedTaskParamDto) {
    return this.fixedTaskService.findById(params.id);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.SUPERVISOR, UserRole.SPECIALIST)
  @ApiOperation({
    summary: 'Update a fixed task template',
    description:
      'Uses the authenticated user ID from JWT. Assignees can only update status.',
  })
  @ApiOkResponse({
    description: 'Fixed task template updated successfully',
    type: FixedTaskResponseDto,
  })
  update(
    @CurrentUserId() requesterId: string,
    @Param() params: FixedTaskParamDto,
    @Body() dto: UpdateFixedTaskDto,
  ) {
    return this.fixedTaskService.update(params.id, requesterId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a fixed task template' })
  @ApiNoContentResponse({
    description: 'Fixed task template deleted successfully',
  })
  delete(@Param() params: FixedTaskParamDto) {
    return this.fixedTaskService.delete(params.id);
  }

}
