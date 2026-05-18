import { Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { BlacklistReason } from '../../../src/blacklist/blacklist-reason.enum';
import { BlacklistService } from '../../../src/blacklist/blacklist.service';
import { hashEmail } from '../../../src/blacklist/email-hash.util';

describe('BlacklistService', () => {
  let repo: { insert: jest.Mock; count: jest.Mock };
  let service: BlacklistService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    repo = {
      insert: jest.fn().mockResolvedValue(undefined),
      count: jest.fn(),
    };
    service = new BlacklistService(repo as never);
  });

  describe('add', () => {
    it('inserts sha256 hash (canonicalized lowercase) instead of raw email', async () => {
      await service.add({
        email: 'A@B.com',
        reason: BlacklistReason.UserDeleted,
        metadata: { userId: 'u-1' },
      });

      expect(repo.insert).toHaveBeenCalledWith({
        emailHash: hashEmail('a@b.com'),
        reason: BlacklistReason.UserDeleted,
        metadata: { userId: 'u-1' },
      });
    });

    it('is idempotent on unique violation', async () => {
      const err = Object.assign(new QueryFailedError('q', [], new Error()), { code: '23505' });
      repo.insert.mockRejectedValue(err);

      await expect(
        service.add({ email: 'dup@x.com', reason: BlacklistReason.UserDeleted }),
      ).resolves.toBeUndefined();
    });

    it('rethrows non-unique errors', async () => {
      repo.insert.mockRejectedValue(new Error('something else'));

      await expect(
        service.add({ email: 'x@y.com', reason: BlacklistReason.AdminBan }),
      ).rejects.toThrow('something else');
    });
  });

  describe('isBlacklisted', () => {
    it('queries by hashed email and returns true when count > 0', async () => {
      repo.count.mockResolvedValue(1);
      expect(await service.isBlacklisted('A@B.com')).toBe(true);
      expect(repo.count).toHaveBeenCalledWith({ where: { emailHash: hashEmail('a@b.com') } });
    });

    it('returns false when count is 0', async () => {
      repo.count.mockResolvedValue(0);
      expect(await service.isBlacklisted('clean@x.com')).toBe(false);
    });

    it('matches case-insensitively via canonicalized hash', async () => {
      repo.count.mockResolvedValue(1);
      await service.isBlacklisted('USER@Example.COM');
      const args = repo.count.mock.calls[0][0];
      expect(args.where.emailHash).toBe(hashEmail('user@example.com'));
    });
  });
});
