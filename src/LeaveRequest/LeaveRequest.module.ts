import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveRequestController } from './LeaveRequest.controller';
import { LeaveRequestService } from './services/leave-request.service';
import { Leave, LeaveSchema } from './LeaveRequest.schema';
import { LeaveRequestWorkflowService } from './services/leave-request-workflow.service';
import { LeaveRequestRepository } from './repositories/leave-request.repository';
import { LeaveRequestPolicyService } from './services/leave-request-policy.service';
import { LeaveRequestCreationService } from './services/leave-request-creation.service';
import { LeaveRequestQueryService } from './services/leave-request-query.service';
import { LeaveRequestUpdateDataBuilder } from './services/leave-request-update-data.builder';
import { LeaveRequestUpdateService } from './services/leave-request-update.service';
import { LeaveRequestDeleteService } from './services/leave-request-delete.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Leave.name, schema: LeaveSchema }])],
  controllers: [LeaveRequestController],
  providers: [
    LeaveRequestService,
    LeaveRequestWorkflowService,
    LeaveRequestRepository,
    LeaveRequestPolicyService,
    LeaveRequestCreationService,
    LeaveRequestQueryService,
    LeaveRequestUpdateDataBuilder,
    LeaveRequestUpdateService,
    LeaveRequestDeleteService,
  ],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}
