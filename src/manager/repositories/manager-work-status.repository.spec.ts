import { Model } from 'mongoose';
import { FixedTaskTemplateDocument } from '../../fixedTask/fixed-task.schema';
import { TaskDocument } from '../../task/task.schema';
import { ManagerWorkStatusRepository } from './manager-work-status.repository';

describe('ManagerWorkStatusRepository', () => {
  it('filters regular and fixed tasks by startDate with createdAt fallback', async () => {
    const taskExec = jest.fn().mockResolvedValue([]);
    const taskLean = jest.fn().mockReturnValue({ exec: taskExec });
    const taskSelect = jest.fn().mockReturnValue({ lean: taskLean });
    const taskFind = jest.fn().mockReturnValue({ select: taskSelect });
    const fixedExec = jest.fn().mockResolvedValue([]);
    const fixedLean = jest.fn().mockReturnValue({ exec: fixedExec });
    const fixedSelect = jest.fn().mockReturnValue({ lean: fixedLean });
    const fixedFind = jest.fn().mockReturnValue({ select: fixedSelect });
    const repository = new ManagerWorkStatusRepository(
      { find: taskFind } as unknown as Model<TaskDocument>,
      { find: fixedFind } as unknown as Model<FixedTaskTemplateDocument>,
    );
    const from = new Date('2026-06-01T00:00:00.000Z');
    const to = new Date('2026-06-30T23:59:59.999Z');
    const filter = {
      $or: [
        { startDate: { $gte: from, $lte: to } },
        {
          startDate: null,
          createdAt: { $gte: from, $lte: to },
        },
      ],
    };

    await repository.findByDateRange(from, to);

    expect(taskFind).toHaveBeenCalledWith(filter);
    expect(fixedFind).toHaveBeenCalledWith(filter);
  });
});
