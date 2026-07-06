import {
  FixedTaskRatingStatus,
  FixedTaskStatus,
} from '../../fixedTask/fixed-task.schema';
import { TaskStatus } from '../../task/task.schema';
import { UserPerformanceStatus } from '../../user/schemas/user.schema';
import { UserProgressCalculatorService } from './user-progress-calculator.service';

describe('UserProgressCalculatorService', () => {
  const calculator = new UserProgressCalculatorService();
  const doneTime = new Date('2026-06-11T10:00:00.000Z');
  const deadline = new Date('2026-06-11T12:00:00.000Z');

  it('returns separate percentages and combined overall completion', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.TODO },
        { status: TaskStatus.TODO },
      ],
      [
        { status: FixedTaskStatus.DONE, doneTime, endDate: deadline },
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.taskProgressPercentage).toBe(50);
    expect(result.fixedTaskProgressPercentage).toBe(50);
    expect(result.progressPercentage).toBe(50);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.NORMAL);
  });

  it('calculates overall progress from all on-time done work divided by all assigned work', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.TODO },
      ],
      [
        { status: FixedTaskStatus.TODO },
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.taskProgressPercentage).toBe(75);
    expect(result.fixedTaskProgressPercentage).toBe(0);
    expect(result.progressPercentage).toBe(50);
  });

  it('calculates fixed-task progress as on-time completed divided by total', () => {
    const result = calculator.calculate(
      [],
      [
        { status: FixedTaskStatus.DONE, doneTime, endDate: deadline },
        { status: FixedTaskStatus.DONE, doneTime, endDate: deadline },
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
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
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
        { status: FixedTaskStatus.DONE, doneTime, endDate: deadline },
        { status: FixedTaskStatus.DONE, doneTime, endDate: deadline },
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

  it('does not count late done work for progress', () => {
    const late = new Date('2026-06-11T13:00:00.000Z');
    const result = calculator.calculate(
      [
        {
          status: TaskStatus.DONE,
          endDate: deadline,
          endTime: '12:00',
          doneTime: late,
        },
      ],
      [
        {
          status: FixedTaskStatus.DONE,
          endDate: deadline,
          endTime: '12:00',
          doneTime: late,
        },
      ],
    );

    expect(result.completedTasks).toBe(1);
    expect(result.completedFixedTasks).toBe(1);
    expect(result.onTimeTasks).toBe(0);
    expect(result.onTimeFixedTasks).toBe(0);
    expect(result.taskProgressPercentage).toBe(0);
    expect(result.fixedTaskProgressPercentage).toBe(0);
    expect(result.progressPercentage).toBe(0);
  });

  it('adds good fixed-task rating score to overall progress', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.DONE, doneTime, endDate: deadline },
        { status: TaskStatus.TODO },
      ],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 4,
          ratingStatus: FixedTaskRatingStatus.GOOD,
        },
      ],
    );

    expect(result.progressPercentage).toBe(95);
  });

  it('does not add normal fixed-task ratings to overall progress', () => {
    const result = calculator.calculate(
      [],
      [
        {
          status: FixedTaskStatus.TODO,
          ratingScore: 2,
          ratingStatus: FixedTaskRatingStatus.NORMAL,
        },
      ],
    );

    expect(result.progressPercentage).toBe(0);
  });
});
