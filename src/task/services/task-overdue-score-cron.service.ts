import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TaskScoreService } from './task-score.service';

@Injectable()
export class TaskOverdueScoreCronService {
  private readonly logger = new Logger(TaskOverdueScoreCronService.name);
  private isRunning = false;

  constructor(private readonly scoreService: TaskScoreService) {}

  @Cron('*/30 * * * * *', { timeZone: 'Asia/Tehran' })
  async handleOverdueTaskScoring(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.logger.log('Overdue task scoring started');
      await this.scoreService.adjustOverdueTasks();
      this.logger.log('Overdue task scoring finished');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Overdue task scoring failed: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
