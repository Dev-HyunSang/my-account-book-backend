import { ConflictException, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { REFRESH_TTL_SEC, RequestContext } from '../../../src/auth/types';
import { AuditAction } from '../../../src/audit/audit-action.enum';
import { hashEmail } from '../../../src/blacklist/email-hash.util';

function fakeIssuedTokens(suffix = '1') {
  return {
    tokens: { accessToken: `access-${suffix}`, refreshToken: `refresh-${suffix}` },
    accessJti: `a-jti-${suffix}`,
    refreshJti: `r-jti-${suffix}`,
    accessExpEpoch: Math.floor(Date.now() / 1000) + 900,
    refreshExpEpoch: Math.floor(Date.now() / 1000) + 86400 * 30,
  };
}

const CTX: RequestContext = { ip: '1.2.3.4', userAgent: 'jest-agent' };

beforeAll(() => {
  // Silence Nest Logger noise during tests.
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});

describe('AuthService', () => {
  let users: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    deleteById: jest.Mock;
    create: jest.Mock;
  };
  let hasher: {
    hash: jest.Mock;
    verify: jest.Mock;
    verifyAgainstDummy: jest.Mock;
  };
  let tokens: {
    issueTokenPair: jest.Mock;
    verifyRefreshToken: jest.Mock;
  };
  let store: {
    whitelistRefresh: jest.Mock;
    consumeRefresh: jest.Mock;
    blacklistAccess: jest.Mock;
    revokeRefresh: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let blacklist: { isBlacklisted: jest.Mock; add: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
    };
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      verify: jest.fn(),
      verifyAgainstDummy: jest.fn().mockResolvedValue(undefined),
    };
    tokens = {
      issueTokenPair: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };
    store = {
      whitelistRefresh: jest.fn().mockResolvedValue(undefined),
      consumeRefresh: jest.fn(),
      blacklistAccess: jest.fn().mockResolvedValue(undefined),
      revokeRefresh: jest.fn().mockResolvedValue(undefined),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    blacklist = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
      add: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthService(
      users as never,
      hasher as never,
      tokens as never,
      store as never,
      audit as never,
      blacklist as never,
    );
  });

  describe('register', () => {
    it('lowercases email, hashes password, persists, and whitelists refresh', async () => {
      users.create.mockResolvedValue({ id: 'u-1', email: 'a@b.com' });
      tokens.issueTokenPair.mockResolvedValue(fakeIssuedTokens('reg'));

      const result = await service.register(
        {
          email: 'A@B.com',
          password: 'pa55word!',
          nickname: 'Alice',
          agreeTerms: true,
          agreePrivacy: true,
        },
        CTX,
      );

      expect(hasher.hash).toHaveBeenCalledWith('pa55word!');
      expect(users.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        passwordHash: 'hashed-password',
        nickname: 'Alice',
        termsAgreedAt: expect.any(Date),
        privacyAgreedAt: expect.any(Date),
      });
      expect(tokens.issueTokenPair).toHaveBeenCalledWith('u-1');
      expect(store.whitelistRefresh).toHaveBeenCalledWith(
        'u-1',
        'r-jti-reg',
        'refresh-reg',
        REFRESH_TTL_SEC,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-1',
          action: AuditAction.Register,
          ip: '1.2.3.4',
          userAgent: 'jest-agent',
          metadata: {
            termsAgreedAt: expect.any(String),
            privacyAgreedAt: expect.any(String),
          },
        }),
      );
      expect(result).toEqual({ accessToken: 'access-reg', refreshToken: 'refresh-reg' });
    });

    it('propagates ConflictException from repository unique-violation', async () => {
      users.create.mockRejectedValue(new ConflictException('Email already registered'));

      await expect(
        service.register(
          {
            email: 'dup@x.com',
            password: 'pa55word!',
            nickname: 'Dup',
            agreeTerms: true,
            agreePrivacy: true,
          },
          CTX,
        ),
      ).rejects.toThrow(ConflictException);
      expect(store.whitelistRefresh).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('blocks registration when email is blacklisted and audits RegisterBlocked', async () => {
      blacklist.isBlacklisted.mockResolvedValue(true);

      await expect(
        service.register(
          {
            email: 'banned@x.com',
            password: 'pa55word!',
            nickname: 'X',
            agreeTerms: true,
            agreePrivacy: true,
          },
          CTX,
        ),
      ).rejects.toThrow(ConflictException);

      expect(users.create).not.toHaveBeenCalled();
      expect(hasher.hash).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          action: AuditAction.RegisterBlocked,
          metadata: { reason: 'email_blacklisted', emailHash: hashEmail('banned@x.com') },
        }),
      );
    });
  });

  describe('checkEmailAvailability', () => {
    it('returns available=true when the email is free', async () => {
      users.findByEmail.mockResolvedValue(null);

      const result = await service.checkEmailAvailability('Free@Example.com');

      expect(blacklist.isBlacklisted).toHaveBeenCalledWith('free@example.com');
      expect(users.findByEmail).toHaveBeenCalledWith('free@example.com');
      expect(result).toEqual({ available: true });
    });

    it('returns available=false when a user already owns the email', async () => {
      users.findByEmail.mockResolvedValue({ id: 'u-1', email: 'taken@example.com' });

      const result = await service.checkEmailAvailability('taken@example.com');

      expect(result).toEqual({ available: false });
    });

    it('returns available=false for a blacklisted email without querying users', async () => {
      blacklist.isBlacklisted.mockResolvedValue(true);

      const result = await service.checkEmailAvailability('banned@example.com');

      expect(result).toEqual({ available: false });
      expect(users.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues tokens on correct credentials and audits success', async () => {
      users.findByEmail.mockResolvedValue({ id: 'u-2', passwordHash: 'stored-hash' });
      hasher.verify.mockResolvedValue(true);
      tokens.issueTokenPair.mockResolvedValue(fakeIssuedTokens('login'));

      const result = await service.login({ email: 'a@b.com', password: 'pa55word!' }, CTX);

      expect(hasher.verify).toHaveBeenCalledWith('stored-hash', 'pa55word!');
      expect(result.accessToken).toBe('access-login');
      expect(hasher.verifyAgainstDummy).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-2', action: AuditAction.LoginSuccess }),
      );
    });

    it('runs dummy verify and audits unknown_email when user is missing', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'Nobody@x.com', password: 'pa55word!' }, CTX),
      ).rejects.toThrow(UnauthorizedException);
      expect(hasher.verifyAgainstDummy).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          action: AuditAction.LoginFailed,
          metadata: { reason: 'unknown_email', attemptedEmail: 'nobody@x.com' },
        }),
      );
    });

    it('audits bad_password when password mismatch', async () => {
      users.findByEmail.mockResolvedValue({ id: 'u-2', passwordHash: 'stored-hash' });
      hasher.verify.mockResolvedValue(false);

      await expect(service.login({ email: 'a@b.com', password: 'wrong' }, CTX)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-2',
          action: AuditAction.LoginFailed,
          metadata: { reason: 'bad_password' },
        }),
      );
    });
  });

  describe('refresh', () => {
    it('rotates tokens and audits RefreshRotated', async () => {
      tokens.verifyRefreshToken.mockResolvedValue({ sub: 'u-3', jti: 'old-jti', type: 'refresh' });
      store.consumeRefresh.mockResolvedValue(true);
      tokens.issueTokenPair.mockResolvedValue(fakeIssuedTokens('rot'));

      const result = await service.refresh({ refreshToken: 'old-refresh' }, CTX);

      expect(store.consumeRefresh).toHaveBeenCalledWith('u-3', 'old-jti', 'old-refresh');
      expect(tokens.issueTokenPair).toHaveBeenCalledWith('u-3');
      expect(result.refreshToken).toBe('refresh-rot');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-3', action: AuditAction.RefreshRotated }),
      );
    });

    it('audits RefreshInvalid when JWT verification fails', async () => {
      tokens.verifyRefreshToken.mockRejectedValue(new Error('bad sig'));

      await expect(service.refresh({ refreshToken: 'tampered' }, CTX)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null, action: AuditAction.RefreshInvalid }),
      );
    });

    it('audits RefreshReplay when consumeRefresh returns false', async () => {
      tokens.verifyRefreshToken.mockResolvedValue({ sub: 'u-3', jti: 'old-jti', type: 'refresh' });
      store.consumeRefresh.mockResolvedValue(false);

      await expect(service.refresh({ refreshToken: 'replayed' }, CTX)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokens.issueTokenPair).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-3',
          action: AuditAction.RefreshReplay,
          metadata: { jti: 'old-jti' },
        }),
      );
    });
  });

  describe('logout', () => {
    it('blacklists access first, revokes refresh, then audits Logout', async () => {
      const now = Math.floor(Date.now() / 1000);
      const calls: string[] = [];
      store.blacklistAccess.mockImplementation(async () => {
        calls.push('blacklist');
      });
      store.revokeRefresh.mockImplementation(async () => {
        calls.push('revoke');
      });

      await service.logout(
        {
          userId: 'u-4',
          accessJti: 'a-1',
          refreshJti: 'r-1',
          accessExpEpoch: now + 600,
        },
        CTX,
      );

      expect(calls).toEqual(['blacklist', 'revoke']);
      const [, ttl] = store.blacklistAccess.mock.calls[0];
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(600);
      expect(store.revokeRefresh).toHaveBeenCalledWith('u-4', 'r-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u-4', action: AuditAction.Logout }),
      );
    });

    it('clamps blacklist TTL to 0 when access already expired', async () => {
      const past = Math.floor(Date.now() / 1000) - 60;

      await service.logout(
        {
          userId: 'u-5',
          accessJti: 'a-2',
          refreshJti: 'r-2',
          accessExpEpoch: past,
        },
        CTX,
      );

      expect(store.blacklistAccess).toHaveBeenCalledWith('a-2', 0);
      expect(store.revokeRefresh).toHaveBeenCalledWith('u-5', 'r-2');
    });
  });

  describe('deleteAccount', () => {
    const now = Math.floor(Date.now() / 1000);
    const baseInput = {
      userId: 'u-del',
      accessJti: 'a-del',
      refreshJti: 'r-del',
      accessExpEpoch: now + 600,
    };

    it('blacklists email, deletes user, revokes session, and audits AccountDeleted', async () => {
      users.findById.mockResolvedValue({ id: 'u-del', email: 'gone@x.com' });

      await service.deleteAccount(baseInput, CTX);

      expect(blacklist.add).toHaveBeenCalledWith({
        email: 'gone@x.com',
        reason: 'user_deleted',
        metadata: { userId: 'u-del' },
      });
      expect(users.deleteById).toHaveBeenCalledWith('u-del');
      expect(store.blacklistAccess).toHaveBeenCalledWith('a-del', expect.any(Number));
      expect(store.revokeRefresh).toHaveBeenCalledWith('u-del', 'r-del');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          action: AuditAction.AccountDeleted,
          metadata: { deletedUserId: 'u-del', emailHash: hashEmail('gone@x.com') },
        }),
      );
    });

    it('runs blacklist insert before user delete (lockout-safe ordering)', async () => {
      users.findById.mockResolvedValue({ id: 'u-del', email: 'gone@x.com' });
      const calls: string[] = [];
      blacklist.add.mockImplementation(async () => {
        calls.push('blacklist');
      });
      users.deleteById.mockImplementation(async () => {
        calls.push('delete');
      });

      await service.deleteAccount(baseInput, CTX);

      expect(calls).toEqual(['blacklist', 'delete']);
    });

    it('only revokes session when user is already gone', async () => {
      users.findById.mockResolvedValue(null);

      await service.deleteAccount(baseInput, CTX);

      expect(blacklist.add).not.toHaveBeenCalled();
      expect(users.deleteById).not.toHaveBeenCalled();
      expect(store.blacklistAccess).toHaveBeenCalled();
      expect(store.revokeRefresh).toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
});
