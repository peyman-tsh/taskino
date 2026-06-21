import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import { UserProgressCalculatorService } from './user-progress-calculator.service';

describe('UserProgressCalculatorService', () => {
  const calculator = new UserProgressCalculatorService();

  it('returns separate task and fixed-task percentages and their average', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.DONE },
        { status: TaskStatus.DONE },
        { status: TaskStatus.TODO },
        { status: TaskStatus.TODO },
      ],
      [
        { status: FixedTaskStatus.DONE },
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.taskProgressPercentage).toBe(50);
    expect(result.fixedTaskProgressPercentage).toBe(50);
    expect(result.progressPercentage).toBe(50);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.NORMAL);
  });

  it('calculates fixed-task progress as completed divided by total', () => {
    const result = calculator.calculate(
      [],
      [
        { status: FixedTaskStatus.DONE },
        { status: FixedTaskStatus.DONE },
        ...Array.from({ length: 31 }, () => ({
          status: FixedTaskStatus.TODO,
        })),
      ],
    );

    expect(result.totalFixedTasks).toBe(33);
    expect(result.completedFixedTasks).toBe(2);
    expect(result.fixedTaskProgressPercentage).toBe(6);
    expect(result.progressPercentage).toBe(6);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.WEAK);
  });

  it('uses task progress as overall when the user has no fixed tasks', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.DONE },
        { status: TaskStatus.DONE },
        { status: TaskStatus.DONE },
        { status: TaskStatus.TODO },
      ],
      [],
    );

    expect(result.taskProgressPercentage).toBe(75);
    expect(result.fixedTaskProgressPercentage).toBe(0);
    expect(result.progressPercentage).toBe(75);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });

  it('uses fixed-task progress as overall when the user has no tasks', () => {
    const result = calculator.calculate(
      [],
      [
        { status: FixedTaskStatus.DONE },
        { status: FixedTaskStatus.DONE },
      ],
    );

    expect(result.taskProgressPercentage).toBe(0);
    expect(result.fixedTaskProgressPercentage).toBe(100);
    expect(result.progressPercentage).toBe(100);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });

  it('does not give completion progress to in-progress work', () => {
    const result = calculator.calculate(
      [{ status: TaskStatus.IN_PROGRESS }],
      [{ status: FixedTaskStatus.IN_PROGRESS }],
    );

    expect(result.taskProgressPercentage).toBe(0);
    expect(result.fixedTaskProgressPercentage).toBe(0);
    expect(result.progressPercentage).toBe(0);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.WEAK);
  });

  it('counts done work for progress regardless of completion time', () => {
    const late = new Date('2026-06-11T13:00:00.000Z');
    const dueDate = new Date('2026-06-11T12:00:00.000Z');
    const result = calculator.calculate(
      [{ status: TaskStatus.DONE, dueDate, doneTime: late }],
      [
        {
          status: FixedTaskStatus.DONE,
          endDate: dueDate,
          endTime: '12:00',
          doneTime: late,
        },
      ],
    );

    expect(result.completedTasks).toBe(1);
    expect(result.completedFixedTasks).toBe(1);
    expect(result.taskProgressPercentage).toBe(100);
    expect(result.fixedTaskProgressPercentage).toBe(100);
    expect(result.progressPercentage).toBe(100);
  });
});
