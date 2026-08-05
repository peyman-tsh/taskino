import { Model } from 'mongoose';
import {
  FixedTaskTemplateDocument,
  FixedTaskStatus,
  FixedTaskTimingApprovalStatus,
} from '../../fixedTask/fixed-task.schema';
import { TaskDocument, TaskStatus } from '../../task/task.schema';
import { ManagerWorkStatusRepository } from './manager-work-status.repository';

describe('ManagerWorkStatusRepository', () => {
  it.each([
    [FixedTaskStatus.IN_PROGRESS, 'findInProgressFixedTasks'],
    [FixedTaskStatus.TODO, 'findTodoFixedTasks'],
  ] as const)(
    'excludes template fixed tasks from active %s documents',
    async (status, methodName) => {
      const taskFind = jest.fn();
      const fixedExec = jest.fn().mockResolvedValue([]);
      const fixedLean = jest.fn().mockReturnValue({ exec: fixedExec });
      const fixedSort = jest.fn().mockReturnValue({ lean: fixedLean });
      const fixedPopulate = jest.fn();
      fixedPopulate.mockReturnValue({
        populate: fixedPopulate,
        sort: fixedSort,
      });
      const fixedFind = jest.fn().mockReturnValue({ populate: fixedPopulate });
      const repository = new ManagerWorkStatusRepository(
        { find: taskFind } as unknown as Model<TaskDocument>,
        { find: fixedFind } as unknown as Model<FixedTaskTemplateDocument>,
      );

      await repository[methodName]();

      expect(fixedFind).toHaveBeenCalledWith({
        $and: [
          {
            status,
            isActive: true,
            isTemplate: { $ne: true },
          },
          {
            timingApprovalStatus: {
              $ne: FixedTaskTimingApprovalStatus.REJECTED,
            },
          },
        ],
      });
    },
  );

  it('excludes template fixed tasks from overdue documents', async () => {
    const taskFind = jest.fn();
    const fixedExec = jest.fn().mockResolvedValue([]);
    const fixedLean = jest.fn().mockReturnValue({ exec: fixedExec });
    const fixedSort = jest.fn().mockReturnValue({ lean: fixedLean });
    const fixedPopulate = jest.fn();
    fixedPopulate.mockReturnValue({ populate: fixedPopulate, sort: fixedSort });
    const fixedFind = jest.fn().mockReturnValue({ populate: fixedPopulate });
    const repository = new ManagerWorkStatusRepository(
      { find: taskFind } as unknown as Model<TaskDocument>,
      { find: fixedFind } as unknown as Model<FixedTaskTemplateDocument>,
    );
    const from = new Date('2026-06-01T00:00:00.000Z');
    const to = new Date('2026-06-30T23:59:59.999Z');
    const evaluatedAt = new Date('2026-07-01T00:00:00.000Z');

    await repository.findOverdueFixedTasks(from, to, evaluatedAt);

    expect(fixedFind).toHaveBeenCalledWith({
      $and: [
        {
          isTemplate: { $ne: true },
          status: FixedTaskStatus.TODO,
          startDate: {
            $gte: from,
            $lte: to,
          },
          endDate: {
            $lt: evaluatedAt,
          },
        },
        {
          timingApprovalStatus: { $ne: FixedTaskTimingApprovalStatus.REJECTED },
        },
      ],
    });
  });

  it('filters regular tasks by overlap and fixed tasks by their full date range', async () => {
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
      startDate: { $gte: from, $lt: to },
    };
    const fixedTaskFilter = {
      $and: [
        fixedFilter,
        {
          timingApprovalStatus: { $ne: FixedTaskTimingApprovalStatus.REJECTED },
        },
      ],
    };

    await repository.findByDateRange(from, to, managerId);

    expect(taskFind).toHaveBeenCalledWith(taskFilter);
    expect(fixedFind).toHaveBeenCalledWith(fixedTaskFilter);
  });

  it('finds non-template fixed-task occurrences by inclusive start-date range', async () => {
    const taskFind = jest.fn();
    const fixedExec = jest.fn().mockResolvedValue([]);
    const fixedLean = jest.fn().mockReturnValue({ exec: fixedExec });
    const fixedSort = jest.fn().mockReturnValue({ lean: fixedLean });
    const fixedPopulate = jest.fn();
    fixedPopulate.mockReturnValue({
      populate: fixedPopulate,
      sort: fixedSort,
    });
    const fixedFind = jest.fn().mockReturnValue({ populate: fixedPopulate });
    const repository = new ManagerWorkStatusRepository(
      { find: taskFind } as unknown as Model<TaskDocument>,
      { find: fixedFind } as unknown as Model<FixedTaskTemplateDocument>,
    );
    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-07-31T23:59:59.999Z');

    await repository.findFixedTasksByDateRange(from, to);

    expect(fixedFind).toHaveBeenCalledWith({
      isTemplate: { $ne: true },
      startDate: { $gte: from, $lte: to },
    });
    expect(fixedSort).toHaveBeenCalledWith({
      startDate: 1,
      endDate: 1,
      _id: 1,
    });
  });

  it('excludes template fixed tasks from per-user work status summary', async () => {
    const taskExec = jest.fn().mockResolvedValue([]);
    const taskLean = jest.fn().mockReturnValue({ exec: taskExec });
    const taskPopulate = jest.fn().mockReturnValue({ lean: taskLean });
    const taskSelect = jest.fn().mockReturnValue({ populate: taskPopulate });
    const taskFind = jest.fn().mockReturnValue({ select: taskSelect });
    const fixedExec = jest.fn().mockResolvedValue([]);
    const fixedLean = jest.fn().mockReturnValue({ exec: fixedExec });
    const fixedPopulate = jest.fn().mockReturnValue({ lean: fixedLean });
    const fixedSelect = jest.fn().mockReturnValue({ populate: fixedPopulate });
    const fixedFind = jest.fn().mockReturnValue({ select: fixedSelect });
    const repository = new ManagerWorkStatusRepository(
      { find: taskFind } as unknown as Model<TaskDocument>,
      { find: fixedFind } as unknown as Model<FixedTaskTemplateDocument>,
    );
    const from = new Date('2026-06-01T00:00:00.000Z');
    const to = new Date('2026-06-30T23:59:59.999Z');
    const managerId = '6a39043bfc4f15b8c14eb3de';

    await repository.findByDateRangeForUsers(from, to, managerId);

    expect(fixedFind).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([{ isTemplate: { $ne: true } }]),
      }),
    );
  });
});
