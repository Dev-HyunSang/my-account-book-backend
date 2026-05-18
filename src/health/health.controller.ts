import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.constants';
import { HealthResponseDto } from './health.response';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe — checks Postgres and Redis connectivity' })
  @ApiResponse({ status: 200, description: 'All dependencies up.', type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'One or more dependencies are degraded.' })
  async check(): Promise<{ status: 'ok'; db: 'up'; redis: 'up' }> {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);
    if (db !== 'up' || redis !== 'up') {
      throw new ServiceUnavailableException({ status: 'degraded', db, redis });
    }
    return { status: 'ok', db, redis };
  }

  private async checkDb(): Promise<'up' | 'down'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const reply = await this.redis.ping();
      return reply === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
