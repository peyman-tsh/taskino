import { Model, Types } from 'mongoose';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplateDocument,
} from '../../fixedTask/fixed-task.schema';
import { TaskDocument, TaskStatus } from '../../task/task.schema';
import { ManagerTasksRepository } from './manager-tasks.repository';

describe('ManagerTasksRepository', () => {
  it('sums done fixed task and task durations by balance rules', async () => {
    const fixedTaskExec = jest.fn().mockResolvedValue([
      { totalActualDurationMinutes: 360 },
    ]);
    const fixedTaskAggregate = jest.fn().mockReturnValue({
      exec: fixedTaskExec,
    });
    const taskExec = jest.fn().mockResolvedValue([
      { totalActualDurationMinutes: 90 },
    ]);
    const taskAggregate = jest.fn().mockReturnValue({ exec: taskExec });
    const repository = new ManagerTasksRepository(
      { aggregate: taskAggregate } as unknown as Model<TaskDocument>,
      { aggregate: fixedTaskAggregate } as unknown as Model<FixedTaskTemplateDocument>,
    );
    const from = new Date('2026-07-01T00:00:00.000Z');
    const to = new Date('2026-07-10T23:59:59.999Z');
    const userId = new Types.ObjectId().toString();

    const result = await repository.sumDoneWorkDurationForBalance(
      from,
      to,
      userId,
    );

    expect(fixedTaskAggregate).toHaveBeenCalledWith([
      {
        $match: {
          status: FixedTaskStatus.DONE,
          actualDurationMinutes: { $type: 'number' },
          approvedDurationMinutes: { $type: 'number' },
          $expr: {
            $lt: ['$actualDurationMinutes', '$approvedDurationMinutes'],
          },
          $or: [
            {
              recurrence: FixedTaskRecurrence.DAILY,
              startDate: { $gte: from, $lte: to },
            },
            {
              recurrence: {
                $in: [
                  FixedTaskRecurrence.WEEKLY,
                  FixedTaskRecurrence.MONTHLY,
                ],
              },
              doneTime: { $gte: from, $lte: to },
            },
          ],
          assignedTo: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalActualDurationMinutes: {
            $sum: '$actualDurationMinutes',
          },
        },
      },
    ]);
    expect(taskAggregate).toHaveBeenCalledWith([
      {
        $match: {
          status: TaskStatus.DONE,
          startDate: { $gte: from, $lte: to },
          doneTime: { $type: 'date' },
          endDate: { $type: 'date' },
          $expr: {
            $and: [
              { $gte: ['$doneTime', '$startDate'] },
              { $gte: ['$endDate', '$doneTime'] },
            ],
          },
          assignedTo: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalActualDurationMinutes: {
            $sum: {
              $max: [
                1,
                {
                  $ceil: {
                    $divide: [
                      { $subtract: ['$doneTime', '$startDate'] },
                      60_000,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    ]);
    expect(result).toBe(450);
  });
});
