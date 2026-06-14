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
import { LeaveRequestService } from './services/leave-request.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { LeaveStatus } from './LeaveRequest.schema';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QueryLeaveRequestDto } from './dto/query-leave-request.dto';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new leave request',
    description: 'Creates a new leave request with the provided information',
  })
  @ApiResponse({ status: 201, description: 'Leave request created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() createLeaveDto: CreateLeaveRequestDto) {
    return this.leaveRequestService.create(createLeaveDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all leave requests',
    description: 'Returns a paginated list of all leave requests with optional filters',
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
    name: 'user',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by leave status (pending, approved, rejected)',
  })
  @ApiQuery({
    name: 'approvedBy',
    required: false,
    type: String,
    description: 'Filter by approver user ID',
  })
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('user') user?: string,
    @Query('status') status?: LeaveStatus,
    @Query('approvedBy') approvedBy?: string,
  ) {
    return this.leaveRequestService.findAll(page, limit, { user, status, approvedBy });
  }

  @Get('filter')
  @ApiOperation({
    summary: 'Filter leave requests by recurrence, date, and time range',
    description:
      'Returns leave requests overlapping the requested date and time range. Recurrence can be daily or weekly.',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered leave requests retrieved successfully',
  })
  filter(@Query() query: QueryLeaveRequestDto) {
    return this.leaveRequestService.filter(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get leave request by ID',
    description: 'Returns a single leave request by its ID',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  findOne(@Param('id') id: string) {
    return this.leaveRequestService.findById(id);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get leave requests by user ID',
    description: 'Returns all leave requests for a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
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
  @ApiResponse({ status: 200, description: 'Leave requests retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.leaveRequestService.findByUserId(userId, page, limit);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update leave request',
    description: 'Updates an existing leave request by its ID',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request updated successfully' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  update(@Param('id') id: string, @Body() updateLeaveDto: UpdateLeaveRequestDto) {
    return this.leaveRequestService.update(id, updateLeaveDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete leave request',
    description: 'Deletes a leave request by its ID',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 204, description: 'Leave request deleted successfully' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  remove(@Param('id') id: string) {
    return this.leaveRequestService.delete(id);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve leave request',
    description: 'Approves a pending leave request by its ID',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request approved successfully' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  approve(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy: string,
  ) {
    return this.leaveRequestService.approveLeave(id, approvedBy);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject leave request',
    description: 'Rejects a pending leave request by its ID',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiResponse({ status: 200, description: 'Leave request rejected successfully' })
  @ApiResponse({ status: 404, description: 'Leave request not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  reject(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy: string,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    return this.leaveRequestService.rejectLeave(id, approvedBy, rejectionReason);
  }
}
