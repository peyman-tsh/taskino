import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FixedTaskRepository } from '../repositories/fixed-task.repository';
import { FixedTaskPolicyService } from './fixed-task-policy.service';
import { FixedTaskDeleteService } from './fixed-task-delete.service';

describe('FixedTaskDeleteService', () => {
  const fixedTaskId = new Types.ObjectId();
  const repository = {
    findRawById: jest.fn(),
    deleteByTitle: jest.fn(),
  };
  const policy = {
    toObjectId: jest.fn(() => fixedTaskId),
  };
  const service = new FixedTaskDeleteService(
    repository as unknown as FixedTaskRepository,
    policy as unknown as FixedTaskPolicyService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('deletes every occurrence with the target document title', async () => {
    repository.findRawById.mockResolvedValue({
      _id: fixedTaskId,
      title: 'Warehouse report',
    });
    repository.deleteByTitle.mockResolvedValue({ deletedCount: 3 });

    await expect(service.delete(fixedTaskId.toString())).resolves.toBeUndefined();

    expect(repository.findRawById).toHaveBeenCalledWith(fixedTaskId);
    expect(repository.deleteByTitle).toHaveBeenCalledWith('Warehouse report');
  });

  it('throws when the target document does not exist', async () => {
    repository.findRawById.mockResolvedValue(null);

    await expect(service.delete(fixedTaskId.toString())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.deleteByTitle).not.toHaveBeenCalled();
  });
});
