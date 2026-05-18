import { createHash } from 'crypto';
import { TokenStore } from '../../../src/auth/services/token-store';

interface RedisStub {
  set: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  getdel: jest.Mock;
}

function createRedisStub(): RedisStub {
  return {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn(),
    getdel: jest.fn(),
  };
}

describe('TokenStore', () => {
  let redis: RedisStub;
  let store: TokenStore;

  beforeEach(() => {
    redis = createRedisStub();
    store = new TokenStore(redis as never);
  });

  it('whitelistRefresh stores sha256 hash with TTL', async () => {
    await store.whitelistRefresh('u1', 'j1', 'raw-refresh', 60);
    const expectedHash = createHash('sha256').update('raw-refresh').digest('hex');
    expect(redis.set).toHaveBeenCalledWith('refresh:u1:j1', expectedHash, 'EX', 60);
  });

  it('isRefreshActive returns false when missing', async () => {
    redis.get.mockResolvedValue(null);
    expect(await store.isRefreshActive('u1', 'j1', 'raw')).toBe(false);
  });

  it('isRefreshActive returns true on matching hash', async () => {
    const hash = createHash('sha256').update('raw').digest('hex');
    redis.get.mockResolvedValue(hash);
    expect(await store.isRefreshActive('u1', 'j1', 'raw')).toBe(true);
  });

  it('isRefreshActive returns false on mismatched hash', async () => {
    const wrongHash = createHash('sha256').update('different').digest('hex');
    redis.get.mockResolvedValue(wrongHash);
    expect(await store.isRefreshActive('u1', 'j1', 'raw')).toBe(false);
  });

  it('revokeRefresh deletes the right key', async () => {
    await store.revokeRefresh('u1', 'j1');
    expect(redis.del).toHaveBeenCalledWith('refresh:u1:j1');
  });

  it('consumeRefresh returns true on matching hash and uses GETDEL', async () => {
    const hash = createHash('sha256').update('raw').digest('hex');
    redis.getdel.mockResolvedValue(hash);
    expect(await store.consumeRefresh('u1', 'j1', 'raw')).toBe(true);
    expect(redis.getdel).toHaveBeenCalledWith('refresh:u1:j1');
  });

  it('consumeRefresh returns false when key was already consumed', async () => {
    redis.getdel.mockResolvedValue(null);
    expect(await store.consumeRefresh('u1', 'j1', 'raw')).toBe(false);
  });

  it('consumeRefresh returns false on mismatched hash', async () => {
    const wrongHash = createHash('sha256').update('different').digest('hex');
    redis.getdel.mockResolvedValue(wrongHash);
    expect(await store.consumeRefresh('u1', 'j1', 'raw')).toBe(false);
  });

  it('blacklistAccess sets the blacklist key with TTL', async () => {
    await store.blacklistAccess('jti-1', 30);
    expect(redis.set).toHaveBeenCalledWith('blacklist:access:jti-1', '1', 'EX', 30);
  });

  it('blacklistAccess no-ops when ttl is non-positive', async () => {
    await store.blacklistAccess('jti-1', 0);
    await store.blacklistAccess('jti-1', -5);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('isAccessBlacklisted returns boolean from EXISTS', async () => {
    redis.exists.mockResolvedValueOnce(1);
    expect(await store.isAccessBlacklisted('j')).toBe(true);
    redis.exists.mockResolvedValueOnce(0);
    expect(await store.isAccessBlacklisted('j')).toBe(false);
  });
});
