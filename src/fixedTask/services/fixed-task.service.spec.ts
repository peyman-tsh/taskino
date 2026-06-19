import { FixedTaskCreationService } from './fixed-task-creation.service';
import { FixedTaskDeleteService } from './fixed-task-delete.service';
import { FixedTaskQueryService } from './fixed-task-query.service';
import { FixedTaskService } from './fixed-task.service';
import { FixedTaskUpdateService } from './fixed-task-update.service';
import { FixedTaskScoreService } from './fixed-task-score.service';

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
  const scoreService = { adjustOverdueTasks: jest.fn() };
  const service = new FixedTaskService(
    creationService as unknown as FixedTaskCreationService,
    queryService as unknown as FixedTaskQueryService,
    updateService as unknown as FixedTaskUpdateService,
    deleteService as unknown as FixedTaskDeleteService,
    scoreService as unknown as FixedTaskScoreService,
  );

  it('delegates commands and queries to focused services', async () => {
    service.create('creator-id', {} as never);
    await service.findAll({} as never);
    service.findById('fixed-id');
    service.getStatusCounts();
    service.update('fixed-id', 'requester-id', {} as never);
    service.delete('fixed-id');
    service.findActiveTemplates('report');

    expect(creationService.create).toHaveBeenCalled();
    expect(queryService.findAll).toHaveBeenCalled();
    expect(scoreService.adjustOverdueTasks).toHaveBeenCalled();
    expect(queryService.findById).toHaveBeenCalled();
    expect(queryService.getStatusCounts).toHaveBeenCalled();
    expect(updateService.update).toHaveBeenCalled();
    expect(deleteService.delete).toHaveBeenCalled();
    expect(queryService.findActiveTemplates).toHaveBeenCalledWith('report');
  });
});
