import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import { UserProgressCalculatorService } from './user-progress-calculator.service';

describe('UserProgressCalculatorService', () => {
  const calculator = new UserProgressCalculatorService();
  const dueDate = new Date('2026-06-11T12:00:00.000Z');
  const onTime = new Date('2026-06-11T11:00:00.000Z');
  const late = new Date('2026-06-11T13:00:00.000Z');

  it('returns 100 and good when all work is successful', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.DONE, dueDate, doneTime: onTime },
        { status: TaskStatus.DONE, dueDate, doneTime: onTime },
      ],
      [
        { status: FixedTaskStatus.DONE, doneTime: onTime },
        { status: FixedTaskStatus.DONE, doneTime: onTime },
      ],
    );

    expect(result.progressPercentage).toBe(100);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });

  it('returns 50 and normal when all work is in progress', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.IN_PROGRESS },
        { status: TaskStatus.IN_PROGRESS },
        { status: TaskStatus.IN_PROGRESS },
      ],
      [
        { status: FixedTaskStatus.IN_PROGRESS },
        { status: FixedTaskStatus.IN_PROGRESS },
        { status: FixedTaskStatus.IN_PROGRESS },
      ],
    );

    expect(result.inProgressTasks).toBe(3);
    expect(result.inProgressFixedTasks).toBe(3);
    expect(result.progressPercentage).toBe(50);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.NORMAL);
  });

  it('does not give progress credit to late completed tasks', () => {
    const result = calculator.calculate(
      [{ status: TaskStatus.DONE, dueDate, doneTime: late }],
      [{ status: FixedTaskStatus.DONE, doneTime: onTime }],
    );

    expect(result.completedTasks).toBe(1);
    expect(result.onTimeTasks).toBe(0);
    expect(result.progressPercentage).toBe(50);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.NORMAL);
  });

  it('returns 100 when a specialist only has one completed fixed task', () => {
    const result = calculator.calculate(
      [],
      [{ status: FixedTaskStatus.DONE, doneTime: onTime }],
    );

    expect(result.totalFixedTasks).toBe(1);
    expect(result.completedFixedTasks).toBe(1);
    expect(result.progressPercentage).toBe(100);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });

  it('returns 50 when a specialist only completed half of fixed tasks', () => {
    const result = calculator.calculate(
      [],
      [
        { status: FixedTaskStatus.DONE, doneTime: onTime },
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.totalFixedTasks).toBe(2);
    expect(result.completedFixedTasks).toBe(1);
    expect(result.progressPercentage).toBe(50);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.NORMAL);
  });

  it('splits progress 50/50 when tasks and fixed tasks are mixed', () => {
    const result = calculator.calculate(
      [{ status: TaskStatus.DONE, dueDate, doneTime: onTime }],
      [
        { status: FixedTaskStatus.DONE, doneTime: onTime },
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.progressPercentage).toBe(75);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });

  it('returns weak when progress is 40 or less', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.IN_PROGRESS },
        { status: TaskStatus.TODO },
        { status: TaskStatus.TODO },
      ],
      [{ status: FixedTaskStatus.TODO }],
    );

    expect(result.progressPercentage).toBe(8);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.WEAK);
  });
});
