import { Module } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';

// P2 will add MaterializerCron to providers here (amendment A9).
@Module({
  providers: [HeartbeatService],
})
export class SchedulerModule {}
