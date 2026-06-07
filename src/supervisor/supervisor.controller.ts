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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { Roles } from '../user/roles.decorator';
import { RolesGuard } from '../user/roles.guard';
import { UserRole } from '../user/schemas/user.schema';
import { SupervisorPaginationQueryDto } from './dto/supervisor-pagination-query.dto';
import { SupervisorProjectParamDto } from './dto/supervisor-project-param.dto';
import {
  ProjectAssigneePerformanceResponseDto,
  ProjectAssigneeResponseDto,
  SupervisorProjectReportResponseDto,
  SupervisorProjectsResponseDto,
  SupervisorStatisticsResponseDto,
  SupervisorTeamPerformanceResponseDto,
} from './dto/supervisor-response.dto';
import { SupervisorService } from './supervisor.service';
import {
  SupervisorTaskParamDto,
  UpdateSupervisedTaskStatusDto,
} from './dto/update-supervised-task-status.dto';
import { AssignProjectSpecialistDto } from './dto/assign-project-specialist.dto';

@ApiTags('Supervisor')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Valid JWT token is required' })
@ApiForbiddenResponse({ description: 'Supervisor role is required' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Get('statistics')
  @ApiOperation({
    summary: 'Get supervisor dashboard statistics',
    description:
      'Returns supervised projects, in-progress tasks, successful tasks in participating projects, and successful tasks assigned to the supervisor.',
  })
  @ApiOkResponse({ type: SupervisorStatisticsResponseDto })
  getStatistics(@CurrentUserId() supervisorId: string) {
    return this.supervisorService.getStatistics(supervisorId);
  }

  @Get('projects')
  @ApiOperation({
    summary: 'Get projects supervised by the current supervisor',
    description: 'Returns paginated supervised projects with task statistics.',
  })
  @ApiOkResponse({ type: SupervisorProjectsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination query' })
  getProjects(
    @CurrentUserId() supervisorId: string,
    @Query() query: SupervisorPaginationQueryDto,
  ) {
    return this.supervisorService.getProjects(supervisorId, query);
  }

  @Patch('projects/:projectId/assignee')
  @ApiOperation({
    summary:
      'Assign or replace the specialist responsible for a supervised project',
    description:
      'Changes the project specialist and transfers every normal and fixed task of the project to that specialist.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Supervised project MongoDB object ID',
  })
  @ApiOkResponse({
    description:
      'Project specialist and all project tasks reassigned successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid specialist or work-field mismatch',
  })
  @ApiNotFoundResponse({
    description: 'Project not found or is not supervised by the current user',
  })
  assignProjectSpecialist(
    @CurrentUserId() supervisorId: string,
    @Param() params: SupervisorProjectParamDto,
    @Body() dto: AssignProjectSpecialistDto,
  ) {
    return this.supervisorService.assignProjectSpecialist(
      supervisorId,
      params.projectId,
      dto.assigneeId,
    );
  }

  @Get('projects/:projectId/assignee')
  @ApiOperation({
    summary: 'Get supervised project assignee',
    description:
      'Returns the responsible specialist when the current supervisor supervises the project.',
  })
  @ApiOkResponse({ type: ProjectAssigneeResponseDto })
  @ApiParam({
    name: 'projectId',
    description: 'Supervised project MongoDB object ID',
  })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  @ApiNotFoundResponse({
    description: 'Project not found or is not supervised by the current user',
  })
  getProjectAssignee(
    @CurrentUserId() supervisorId: string,
    @Param() params: SupervisorProjectParamDto,
  ) {
    return this.supervisorService.getProjectAssignee(
      supervisorId,
      params.projectId,
    );
  }

  @Get('projects/:projectId/assignee/performance')
  @ApiOperation({
    summary: 'Get supervised project assignee performance',
    description:
      'Returns task counts, completion rate, and score for the responsible specialist.',
  })
  @ApiOkResponse({ type: ProjectAssigneePerformanceResponseDto })
  @ApiParam({
    name: 'projectId',
    description: 'Supervised project MongoDB object ID',
  })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  @ApiNotFoundResponse({
    description: 'Project not found or is not supervised by the current user',
  })
  getProjectAssigneePerformance(
    @CurrentUserId() supervisorId: string,
    @Param() params: SupervisorProjectParamDto,
  ) {
    return this.supervisorService.getProjectAssigneePerformance(
      supervisorId,
      params.projectId,
    );
  }

  @Patch('projects/:projectId/tasks/:taskId/status')
  @ApiOperation({
    summary: 'Update a supervised project task status',
    description:
      'Updates task status only when the current supervisor supervises its project.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Supervised project MongoDB object ID',
  })
  @ApiParam({ name: 'taskId', description: 'Task MongoDB object ID' })
  @ApiOkResponse({ description: 'Task status updated successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid project ID, task ID, or status',
  })
  @ApiNotFoundResponse({ description: 'Supervised project or task not found' })
  updateTaskStatus(
    @CurrentUserId() supervisorId: string,
    @Param() params: SupervisorTaskParamDto,
    @Body() dto: UpdateSupervisedTaskStatusDto,
  ) {
    return this.supervisorService.updateTaskStatus(
      supervisorId,
      params.projectId,
      params.taskId,
      dto.status,
    );
  }

  @Get('tasks/overdue')
  @ApiOperation({
    summary: 'Get overdue tasks from supervised projects',
    description:
      'Returns unfinished tasks whose due date has passed across all supervised projects.',
  })
  @ApiOkResponse({ description: 'Overdue tasks retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid pagination query' })
  getOverdueTasks(
    @CurrentUserId() supervisorId: string,
    @Query() query: SupervisorPaginationQueryDto,
  ) {
    return this.supervisorService.getOverdueTasks(supervisorId, query);
  }

  @Get('projects/:projectId/report')
  @ApiOperation({
    summary: 'Get supervised project report',
    description:
      'Returns project task status, overdue task count, member count, and completion rate.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Supervised project MongoDB object ID',
  })
  @ApiOkResponse({ type: SupervisorProjectReportResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid project ID' })
  @ApiNotFoundResponse({
    description: 'Project not found or is not supervised by the current user',
  })
  getProjectReport(
    @CurrentUserId() supervisorId: string,
    @Param() params: SupervisorProjectParamDto,
  ) {
    return this.supervisorService.getProjectReport(
      supervisorId,
      params.projectId,
    );
  }

  @Get('team/performance')
  @ApiOperation({
    summary: 'Get all supervised assignees performance',
    description:
      'Aggregates every unique member across all supervised projects and returns their combined performance.',
  })
  @ApiOkResponse({ type: SupervisorTeamPerformanceResponseDto })
  getTeamPerformance(@CurrentUserId() supervisorId: string) {
    return this.supervisorService.getTeamPerformance(supervisorId);
  }
}
