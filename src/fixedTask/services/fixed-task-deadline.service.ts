import { Injectable } from '@nestjs/common';
import {
  FixedTaskRecurrence,
  FixedTaskTemplateDocument,
} from '../fixed-task.schema';

@Injectable()
export class FixedTaskDeadlineService {
  getScoreDeadline(task: FixedTaskTemplateDocument): Date | null {
    if (!task.endDate) return null;

    return this.applyTime(new Date(task.endDate), task.endTime);
  }

  getNextDeadline(
    recurrence: FixedTaskRecurrence,
    endTime?: string,
    now = new Date(),
  ): Date {
    if (recurrence === FixedTaskRecurrence.DAILY) {
      const deadline = this.applyTime(new Date(now), endTime);
      if (deadline.getTime() <= now.getTime()) {
        deadline.setDate(deadline.getDate() + 1);
      }
      return deadline;
    }

    if (recurrence === FixedTaskRecurrence.WEEKLY) {
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + ((5 - deadline.getDay() + 7) % 7));
      this.applyTime(deadline, endTime);
      if (deadline.getTime() <= now.getTime()) {
        deadline.setDate(deadline.getDate() + 7);
      }
      return deadline;
    }

    const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.applyTime(deadline, endTime);
    if (deadline.getTime() <= now.getTime()) {
      deadline.setMonth(deadline.getMonth() + 2, 0);
      this.applyTime(deadline, endTime);
    }
    return deadline;
  }

  private applyTime(date: Date, time?: string): Date {
    if (!time) {
      date.setHours(23, 59, 59, 999);
      return date;
    }

    const [hours, minutes] = time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
