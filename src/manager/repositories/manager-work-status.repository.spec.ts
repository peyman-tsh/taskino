import { Model } from 'mongoose';
import {
  FixedTaskTemplateDocument,
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../../fixedTask/fixed-task.schema';
import { TaskDocument, TaskStatus } from '../../task/task.schema';
import { ManagerWorkStatusRepository } from './manager-work-status.repository';

describe('ManagerWorkStatusRepository', () => {
  it('filters regular and fixed tasks by date overlap with createdAt fallback', async () => {
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
    const managerId = '6a39043bfc4f15b8c14eb3de';
    const taskFilter = {
      $or: [
        { status: TaskStatus.IN_PROGRESS },
        {
          startDate: { $lte: to },
          endDate: { $gte: from },
        },
        {
          startDate: { $lte: to },
          dueDate: { $gte: from },
        },
        { startDate: { $gte: from, $lte: to } },
        { endDate: { $gte: from, $lte: to } },
        { dueDate: { $gte: from, $lte: to } },
        {
          startDate: null,
          createdAt: { $gte: from, $lte: to },
        },
      ],
    };
    const fixedFilter = {
      $or: [
        { status: FixedTaskStatus.IN_PROGRESS, isActive: true },
        { status: FixedTaskStatus.TODO, isActive: true },
        {
          startDate: { $lte: to },
          endDate: { $gte: from },
        },
        { startDate: { $gte: from, $lte: to } },
        { endDate: { $gte: from, $lte: to } },
        {
          startDate: null,
          createdAt: { $gte: from, $lte: to },
        },
      ],
    };
    const fixedTaskFilter = {
      $and: [
        fixedFilter,
        { timingApprovalStatus: { $ne: FixedTaskTimingApprovalStatus.REJECTED } },
      ],
    };

    await repository.findByDateRange(from, to, managerId);

    expect(taskFind).toHaveBeenCalledWith(taskFilter);
    expect(fixedFind).toHaveBeenCalledWith(fixedTaskFilter);
  });
});
