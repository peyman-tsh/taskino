import { FixedTaskStatus } from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import { UserProgressCalculatorService } from './user-progress-calculator.service';

describe('UserProgressCalculatorService', () => {
  const calculator = new UserProgressCalculatorService();
  const dueDate = new Date('2026-06-11T12:00:00.000Z');
  const onTime = new Date('2026-06-11T11:00:00.000Z');
  const late = new Date('2026-06-11T13:00:00.000Z');
  const fixedTaskOnTime = new Date(2026, 5, 11, 11, 0);
  const fixedTaskLate = new Date(2026, 5, 11, 13, 0);
  const fixedTaskDeadline = {
    endDate: new Date(2026, 5, 11),
    endTime: '12:00',
  };

  it('returns 100 and good when all work is successful', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.DONE, dueDate, doneTime: onTime },
        { status: TaskStatus.DONE, dueDate, doneTime: onTime },
      ],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime: fixedTaskOnTime,
          ...fixedTaskDeadline,
        },
        {
          status: FixedTaskStatus.DONE,
          doneTime: fixedTaskOnTime,
          ...fixedTaskDeadline,
        },
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
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime: fixedTaskOnTime,
          ...fixedTaskDeadline,
        },
      ],
    );

    expect(result.completedTasks).toBe(1);
    expect(result.onTimeTasks).toBe(0);
    expect(result.progressPercentage).toBe(50);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.NORMAL);
  });

  it('returns 100 when a specialist only has one completed fixed task', () => {
    const result = calculator.calculate(
      [],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime: fixedTaskOnTime,
          ...fixedTaskDeadline,
        },
      ],
    );

    expect(result.totalFixedTasks).toBe(1);
    expect(result.completedFixedTasks).toBe(1);
    expect(result.progressPercentage).toBe(100);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });

  it('calculates fixed task progress from successful occurrences', () => {
    const result = calculator.calculate(
      [],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime: fixedTaskOnTime,
          ...fixedTaskDeadline,
        },
        ...Array.from({ length: 38 }, () => ({
          status: FixedTaskStatus.TODO,
        })),
      ],
    );

    expect(result.totalFixedTasks).toBe(39);
    expect(result.completedFixedTasks).toBe(1);
    expect(result.onTimeFixedTasks).toBe(1);
    expect(result.progressPercentage).toBe(3);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.WEAK);
  });

  it('combines task and fixed task progress using equal category weights', () => {
    const result = calculator.calculate(
      [{ status: TaskStatus.DONE, dueDate, doneTime: onTime }],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime: fixedTaskOnTime,
          ...fixedTaskDeadline,
        },
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.progressPercentage).toBe(75);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.GOOD);
  });

  it('does not give progress credit to a late fixed task', () => {
    const result = calculator.calculate(
      [],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime: fixedTaskLate,
          ...fixedTaskDeadline,
        },
      ],
    );

    expect(result.completedFixedTasks).toBe(1);
    expect(result.onTimeFixedTasks).toBe(0);
    expect(result.progressPercentage).toBe(0);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.WEAK);
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
