import { Inject, Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Redis } from 'ioredis';
import { REDIS } from '../../redis/redis.constants';

@Injectable()
export class TokenStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async whitelistRefresh(
    userId: string,
    jti: string,
    rawToken: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(this.refreshKey(userId, jti), this.hashToken(rawToken), 'EX', ttlSeconds);
  }

  async revokeRefresh(userId: string, jti: string): Promise<void> {
    await this.redis.del(this.refreshKey(userId, jti));
  }

  async isRefreshActive(userId: string, jti: string, rawToken: string): Promise<boolean> {
    const stored = await this.redis.get(this.refreshKey(userId, jti));
    return this.matchesStoredHash(stored, rawToken);
  }

  // Atomic single-use consume: returns true exactly once for a given key,
  // closing the double-spend window between two concurrent refresh calls.
  async consumeRefresh(userId: string, jti: string, rawToken: string): Promise<boolean> {
    const stored = (await this.redis.getdel(this.refreshKey(userId, jti))) as string | null;
    return this.matchesStoredHash(stored, rawToken);
  }

  private matchesStoredHash(stored: string | null, rawToken: string): boolean {
    if (stored === null) return false;
    const expectedHex = this.hashToken(rawToken);
    if (stored.length !== expectedHex.length) return false;
    return timingSafeEqual(Buffer.from(stored), Buffer.from(expectedHex));
  }

  async blacklistAccess(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.redis.set(this.blacklistKey(jti), '1', 'EX', ttlSeconds);
  }

  async isAccessBlacklisted(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(this.blacklistKey(jti));
    return exists === 1;
  }

  private refreshKey(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  private blacklistKey(jti: string): string {
    return `blacklist:access:${jti}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
