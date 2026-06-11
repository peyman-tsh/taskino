import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { PaginatedFixedTasksResponseDto } from '../fixedTask/dto/fixed-task-response.dto';
import { PaginatedTasksResponseDto } from '../task/dto/task-response.dto';
import { Roles } from '../user/roles.decorator';
import { RolesGuard } from '../user/roles.guard';
import { UserRole } from '../user/schemas/user.schema';
import {
  SupervisorFixedTasksQueryDto,
  SupervisorPaginationQueryDto,
  SupervisorRecurrenceQueryDto,
  SupervisorTasksQueryDto,
} from './dto/supervisor-query.dto';
import {
  PaginatedSupervisorMembersResponseDto,
  SupervisorStatisticsResponseDto,
} from './dto/supervisor-response.dto';
import { SupervisorService } from './services/supervisor.service';

@ApiTags('Supervisor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Get('statistics')
  @ApiOperation({
    summary: 'Get supervisor panel statistics',
    description:
      'Returns supervised work counts, current supervisor in-progress work, and successful task counts.',
  })
  @ApiOkResponse({ type: SupervisorStatisticsResponseDto })
  getStatistics(
    @CurrentUserId() supervisorId: string,
    @Query() query: SupervisorRecurrenceQueryDto,
  ) {
    return this.supervisorService.getStatistics(supervisorId, query);
  }

  @Get('members')
  @ApiOperation({
    summary: 'Get current supervisor members and their performance',
    description:
      'Returns users assigned to tasks or fixed tasks created by the current supervisor, including scores, stored performance, progress, and work counts.',
  })
  @ApiOkResponse({ type: PaginatedSupervisorMembersResponseDto })
  findMembers(
    @CurrentUserId() supervisorId: string,
    @Query() query: SupervisorPaginationQueryDto,
  ) {
    return this.supervisorService.findMembers(supervisorId, query);
  }

  @Get('tasks')
  @ApiOperation({
    summary: 'Get tasks supervised by current supervisor',
    description:
      'Returns tasks created by the current supervisor with optional status and recurrence filters.',
  })
  @ApiOkResponse({ type: PaginatedTasksResponseDto })
  findSupervisedTasks(
    @CurrentUserId() supervisorId: string,
    @Query() query: SupervisorTasksQueryDto,
  ) {
    return this.supervisorService.findSupervisedTasks(supervisorId, query);
  }

  @Get('fixed-tasks')
  @ApiOperation({
    summary: 'Get fixed tasks supervised by current supervisor',
    description:
      'Returns fixed tasks created by the current supervisor with optional filters.',
  })
  @ApiOkResponse({ type: PaginatedFixedTasksResponseDto })
  findSupervisedFixedTasks(
    @CurrentUserId() supervisorId: string,
    @Query() query: SupervisorFixedTasksQueryDto,
  ) {
    return this.supervisorService.findSupervisedFixedTasks(supervisorId, query);
  }
}
