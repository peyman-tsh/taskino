import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskRecurrence, TaskStatus } from '../../task/task.schema';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import { PeriodPerformanceCalculatorService } from './period-performance-calculator.service';

describe('PeriodPerformanceCalculatorService', () => {
  const calculator = new PeriodPerformanceCalculatorService();
  const period = {
    start: new Date('2026-06-01T00:00:00.000Z'),
    end: new Date('2026-07-01T00:00:00.000Z'),
  };
  const doneTime = new Date('2026-06-10T10:00:00.000Z');

  it('returns good when period progress is 75 percent', () => {
    const result = calculator.calculate(
      TaskRecurrence.MONTHLY,
      period,
      [
        {
          status: TaskStatus.DONE,
          doneTime,
          dueDate: new Date('2026-06-10T12:00:00.000Z'),
        },
        { status: TaskStatus.TODO },
      ],
      [
        { status: FixedTaskStatus.DONE, doneTime },
        { status: FixedTaskStatus.DONE, doneTime },
      ],
    );

    expect(result.progressPercentage).toBe(75);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });
});
