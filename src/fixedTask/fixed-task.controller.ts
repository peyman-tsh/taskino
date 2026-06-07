import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
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
import { FixedTaskService } from './fixed-task.service';
import { QueryIncompleteFixedTaskReportDto } from './dto/query-incomplete-fixed-task-report.dto';
import {
  FixedTaskResponseDto,
  IncompleteFixedTaskReportResponseDto,
  PaginatedFixedTasksResponseDto,
} from './dto/fixed-task-response.dto';

@ApiTags('Fixed Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('fixed-tasks')
export class FixedTaskController {
  constructor(private readonly fixedTaskService: FixedTaskService) {}

  @Get('reports/incomplete')
  @ApiOperation({
    summary: 'Report incomplete recurring fixed tasks',
    description:
      'Reports incomplete daily, weekly, or monthly fixed task executions and indicates whether their deadline has passed.',
  })
  @ApiOkResponse({ description: 'Incomplete fixed task report retrieved successfully', type: IncompleteFixedTaskReportResponseDto })
  getIncompleteReport(
    @CurrentUserId() managerId: string,
    @Query() query: QueryIncompleteFixedTaskReportDto,
  ) {
    return this.fixedTaskService.getIncompleteReport(managerId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a fixed task template' })
  @ApiCreatedResponse({ description: 'Fixed task template created successfully', type: FixedTaskResponseDto })
  create(@CurrentUserId() creatorId: string, @Body() dto: CreateFixedTaskDto) {
    return this.fixedTaskService.create(creatorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get fixed task templates with filters and pagination' })
  @ApiOkResponse({ description: 'Fixed task templates retrieved successfully', type: PaginatedFixedTasksResponseDto })
  findAll(@Query() query: QueryFixedTaskDto) {
    return this.fixedTaskService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one fixed task template' })
  @ApiOkResponse({ description: 'Fixed task template retrieved successfully', type: FixedTaskResponseDto })
  @ApiNotFoundResponse({ description: 'Fixed task template not found' })
  findOne(@Param() params: FixedTaskParamDto) {
    return this.fixedTaskService.findById(params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fixed task template' })
  @ApiOkResponse({ description: 'Fixed task template updated successfully', type: FixedTaskResponseDto })
  update(
    @CurrentUserId() creatorId: string,
    @Param() params: FixedTaskParamDto,
    @Body() dto: UpdateFixedTaskDto,
  ) {
    return this.fixedTaskService.update(params.id, creatorId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a fixed task template' })
  @ApiNoContentResponse({ description: 'Fixed task template deleted successfully' })
  delete(@Param() params: FixedTaskParamDto) {
    return this.fixedTaskService.delete(params.id);
  }
}
