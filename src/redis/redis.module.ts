import { Global, Inject, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS } from './redis.constants';

@Injectable()
class RedisLifecycle implements OnModuleDestroy {
  private readonly logger = new Logger(RedisLifecycle.name);

  constructor(@Inject(REDIS) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      try {
        await this.client.quit();
      } catch (err) {
        this.logger.error(`Redis quit failed: ${(err as Error).message}`);
      }
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const url = config.get<string>('redisUrl');
        if (!url) {
          throw new Error('REDIS_URL is not configured');
        }
        return new Redis(url, {
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        });
      },
    },
    RedisLifecycle,
  ],
  exports: [REDIS],
})
export class RedisModule {}
