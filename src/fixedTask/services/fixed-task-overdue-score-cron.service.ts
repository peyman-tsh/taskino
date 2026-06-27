import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FixedTaskScoreService } from './fixed-task-score.service';

@Injectable()
export class FixedTaskOverdueScoreCronService {
  private readonly logger = new Logger(FixedTaskOverdueScoreCronService.name);
  private isRunning = false;

  constructor(private readonly scoreService: FixedTaskScoreService) {}

  @Cron('*/5 * * * *', { timeZone: 'Asia/Tehran' })
  async handleOverdueFixedTaskScoring(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.logger.log('Overdue fixed task scoring started');
      await this.scoreService.adjustOverdueTasks();
      this.logger.log('Overdue fixed task scoring finished');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Overdue fixed task scoring failed: ${message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
