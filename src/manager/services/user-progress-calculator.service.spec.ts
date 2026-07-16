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
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
        },
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.taskProgressPercentage).toBe(50);
    expect(result.fixedTaskProgressPercentage).toBe(50);
    expect(result.progressPercentage).toBe(50);
    expect(result.performanceStatus).toBe(UserPerformanceStatus.NORMAL);
  });

  it('calculates overall progress from all done work divided by all assigned work', () => {
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
    expect(result.progressPercentage).toBe(15);
  });

  it('calculates fixed-task progress from manager rating score divided by max score', () => {
    const result = calculator.calculate(
      [],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
        },
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
        },
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
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
        },
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
        },
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

  it('counts late done work for completion progress', () => {
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
          ratingScore: 5,
        },
      ],
    );

    expect(result.completedTasks).toBe(1);
    expect(result.completedFixedTasks).toBe(1);
    expect(result.onTimeTasks).toBe(0);
    expect(result.onTimeFixedTasks).toBe(0);
    expect(result.taskProgressPercentage).toBe(100);
    expect(result.fixedTaskProgressPercentage).toBe(100);
    expect(result.progressPercentage).toBe(100);
  });

  it('calculates weighted progress from fixed-task ratings and task completion', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.TODO },
        { status: TaskStatus.TODO },
      ],
      [
        ...Array.from({ length: 5 }, () => ({
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
        })),
        ...Array.from({ length: 2 }, () => ({
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 3,
        })),
        ...Array.from({ length: 2 }, () => ({
          status: FixedTaskStatus.TODO,
        })),
        { status: FixedTaskStatus.TODO },
      ],
    );

    expect(result.totalTasks).toBe(2);
    expect(result.totalFixedTasks).toBe(10);
    expect(result.fixedTaskProgressPercentage).toBe(62);
    expect(result.taskProgressPercentage).toBe(0);
    expect(result.progressPercentage).toBe(50);
  });

  it('caps full fixed-task score at 80 percent when tasks also exist and are not done', () => {
    const result = calculator.calculate(
      [
        { status: TaskStatus.TODO },
        { status: TaskStatus.TODO },
      ],
      [
        ...Array.from({ length: 10 }, () => ({
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
          ratingStatus: FixedTaskRatingStatus.GOOD,
        })),
      ],
    );

    expect(result.fixedTaskProgressPercentage).toBe(100);
    expect(result.taskProgressPercentage).toBe(0);
    expect(result.progressPercentage).toBe(80);
  });

  it('uses fixed-task score as overall progress when no tasks exist', () => {
    const result = calculator.calculate(
      [],
      [
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 3,
          ratingStatus: FixedTaskRatingStatus.NORMAL,
        },
        {
          status: FixedTaskStatus.DONE,
          doneTime,
          endDate: deadline,
          ratingScore: 5,
          ratingStatus: FixedTaskRatingStatus.GOOD,
        },
      ],
    );

    expect(result.fixedTaskProgressPercentage).toBe(80);
    expect(result.progressPercentage).toBe(80);
  });

  it('treats unrated fixed tasks as zero score', () => {
    const result = calculator.calculate(
      [],
      [
        {
          status: FixedTaskStatus.TODO,
        },
      ],
    );

    expect(result.fixedTaskProgressPercentage).toBe(0);
    expect(result.progressPercentage).toBe(0);
  });
});
