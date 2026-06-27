import { FixedTaskCreationService } from './fixed-task-creation.service';
import { FixedTaskDeleteService } from './fixed-task-delete.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskService } from './fixed-task.service';
import { FixedTaskUpdateService } from './fixed-task-update.service';
import { FixedTaskTimingService } from './fixed-task-timing.service';

describe('FixedTaskService', () => {
  const creationService = { create: jest.fn() };
  const queryService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    getStatusCounts: jest.fn(),
    findActiveTemplates: jest.fn(),
  };
  const updateService = { update: jest.fn() };
  const deleteService = { delete: jest.fn() };
  const timingService = {
    startTimer: jest.fn(),
    reviewTiming: jest.fn(),
  };
  const service = new FixedTaskService(
    creationService as unknown as FixedTaskCreationService,
    queryService as unknown as FixedTaskQueryService,
    updateService as unknown as FixedTaskUpdateService,
    deleteService as unknown as FixedTaskDeleteService,
    timingService as unknown as FixedTaskTimingService,
  );

  it('delegates commands and queries to focused services', async () => {
    service.create('creator-id', {} as never);
    await service.findAll({} as never);
    service.findById('fixed-id');
    service.getStatusCounts();
    service.update('fixed-id', 'requester-id', {} as never);
    service.startTimer('fixed-id', 'requester-id');
    service.reviewTiming(
      'fixed-id',
      'manager-id',
      'approved' as never,
      225,
    );
    service.delete('fixed-id');
    service.findActiveTemplates('user-id');

    expect(creationService.create).toHaveBeenCalled();
    expect(queryService.findAll).toHaveBeenCalled();
    expect(queryService.findById).toHaveBeenCalled();
    expect(queryService.getStatusCounts).toHaveBeenCalled();
    expect(updateService.update).toHaveBeenCalled();
    expect(timingService.startTimer).toHaveBeenCalled();
    expect(timingService.reviewTiming).toHaveBeenCalled();
    expect(deleteService.delete).toHaveBeenCalled();
    expect(queryService.findActiveTemplates).toHaveBeenCalledWith('user-id');
  });
});
