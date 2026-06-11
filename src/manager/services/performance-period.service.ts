import { Injectable } from '@nestjs/common';
import { TaskRecurrence } from '../../task/task.schema';

export interface PerformancePeriod {
  start: Date;
  end: Date;
}

@Injectable()
export class PerformancePeriodService {
  getPeriod(
    recurrence: TaskRecurrence,
    referenceDate = new Date(),
  ): PerformancePeriod {
    if (recurrence === TaskRecurrence.DAILY) {
      return this.dailyPeriod(referenceDate);
    }
    if (recurrence === TaskRecurrence.WEEKLY) {
      return this.weeklyPeriod(referenceDate);
    }

    return this.monthlyPeriod(referenceDate);
  }

  private dailyPeriod(referenceDate: Date): PerformancePeriod {
    const start = this.startOfUtcDay(referenceDate);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  private weeklyPeriod(referenceDate: Date): PerformancePeriod {
    const start = this.startOfUtcDay(referenceDate);
    const daysSinceSaturday = (start.getUTCDay() + 1) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceSaturday);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }

  private monthlyPeriod(referenceDate: Date): PerformancePeriod {
    const start = new Date(
      Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth() + 1,
        1,
      ),
    );
    return { start, end };
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
