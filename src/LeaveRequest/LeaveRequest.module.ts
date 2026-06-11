import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveRequestController } from './LeaveRequest.controller';
import { LeaveRequestService } from './services/leave-request.service';
import { Leave, LeaveSchema } from './LeaveRequest.schema';
import { LeaveRequestWorkflowService } from './services/leave-request-workflow.service';
import { LeaveRequestRepository } from './repositories/leave-request.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: Leave.name, schema: LeaveSchema }])],
  controllers: [LeaveRequestController],
  providers: [
    LeaveRequestService,
    LeaveRequestWorkflowService,
    LeaveRequestRepository,
  ],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}
