import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  @Cron('5 0 * * *', { timeZone: 'Asia/Seoul' })
  handleHeartbeat(): void {
    this.logger.log('Scheduler heartbeat — application is running');
  }
}
