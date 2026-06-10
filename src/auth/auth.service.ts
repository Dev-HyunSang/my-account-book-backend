import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuditAction } from '../audit/audit-action.enum';
import { AuditLogService } from '../audit/audit-log.service';
import { BlacklistReason } from '../blacklist/blacklist-reason.enum';
import { BlacklistService } from '../blacklist/blacklist.service';
import { hashEmail } from '../blacklist/email-hash.util';
import { UsersRepository } from '../users/users.repository';
import { PasswordHasher } from './services/password-hasher';
import { TokenService } from './services/token.service';
import { TokenStore } from './services/token-store';
import { IssuedTokens, REFRESH_TTL_SEC, RefreshClaims, RequestContext } from './types';

interface CredentialsInput {
  email: string;
  password: string;
}

interface RegisterInput extends CredentialsInput {
  nickname: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

interface RefreshInput {
  refreshToken: string;
}

interface LogoutInput {
  userId: string;
  accessJti: string;
  refreshJti: string;
  accessExpEpoch: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly store: TokenStore,
    private readonly audit: AuditLogService,
    private readonly blacklist: BlacklistService,
  ) {}

  async register(input: RegisterInput, ctx: RequestContext): Promise<IssuedTokens> {
    const email = input.email.toLowerCase();
    if (await this.blacklist.isBlacklisted(email)) {
      this.logger.warn(`Register blocked: email is blacklisted`);
      await this.audit.record({
        userId: null,
        action: AuditAction.RegisterBlocked,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'email_blacklisted', emailHash: hashEmail(email) },
      });
      // Use the same message as the duplicate-email case so blacklist
      // membership is not leaked to the caller.
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.hasher.hash(input.password);
    // Record when the user gave consent. The DTO has already enforced that both
    // agreements are present and true; we only need to stamp the time here.
    const agreedAt = new Date();
    const user = await this.users.create({
      email,
      passwordHash,
      nickname: input.nickname,
      termsAgreedAt: agreedAt,
      privacyAgreedAt: agreedAt,
    });
    this.logger.log(`User registered: ${user.id}`);
    await this.audit.record({
      userId: user.id,
      action: AuditAction.Register,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      // Append-only proof of consent, independent of the (mutable) user columns.
      metadata: {
        termsAgreedAt: agreedAt.toISOString(),
        privacyAgreedAt: agreedAt.toISOString(),
      },
    });
    return this.issuePairFor(user.id);
  }

  async login(input: CredentialsInput, ctx: RequestContext): Promise<IssuedTokens> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      await this.hasher.verifyAgainstDummy();
      this.logger.warn(`Login failed: unknown email`);
      await this.audit.record({
        userId: null,
        action: AuditAction.LoginFailed,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'unknown_email', attemptedEmail: input.email.toLowerCase() },
      });
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await this.hasher.verify(user.passwordHash, input.password);
    if (!ok) {
      this.logger.warn(`Login failed: bad password for ${user.id}`);
      await this.audit.record({
        userId: user.id,
        action: AuditAction.LoginFailed,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { reason: 'bad_password' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }
    this.logger.log(`Login success: ${user.id}`);
    await this.audit.record({
      userId: user.id,
      action: AuditAction.LoginSuccess,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return this.issuePairFor(user.id);
  }

  async refresh(input: RefreshInput, ctx: RequestContext): Promise<IssuedTokens> {
    let claims: RefreshClaims;
    try {
      claims = await this.tokens.verifyRefreshToken(input.refreshToken);
    } catch {
      this.logger.warn(`Refresh rejected: invalid token`);
      await this.audit.record({
        userId: null,
        action: AuditAction.RefreshInvalid,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Invalid refresh token');
    }
    const consumed = await this.store.consumeRefresh(claims.sub, claims.jti, input.refreshToken);
    if (!consumed) {
      this.logger.warn(`Refresh replay attempt: user=${claims.sub} jti=${claims.jti}`);
      await this.audit.record({
        userId: claims.sub,
        action: AuditAction.RefreshReplay,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { jti: claims.jti },
      });
      throw new UnauthorizedException('Refresh token is no longer active');
    }
    this.logger.log(`Refresh rotated: user=${claims.sub}`);
    await this.audit.record({
      userId: claims.sub,
      action: AuditAction.RefreshRotated,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return this.issuePairFor(claims.sub);
  }

  async deleteAccount(input: LogoutInput, ctx: RequestContext): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      // Token-side state already references a missing user; revoke session and exit.
      await this.revokeCurrentSession(input);
      return;
    }
    // 1. Blacklist FIRST so a failure midway never leaves the email re-registerable.
    await this.blacklist.add({
      email: user.email,
      reason: BlacklistReason.UserDeleted,
      metadata: { userId: user.id },
    });
    // 2. Delete the user row. audit_log FK is ON DELETE SET NULL — past records survive.
    await this.users.deleteById(user.id);
    // 3. Best-effort revoke of the current session.
    await this.revokeCurrentSession(input);
    // 4. Audit (userId=null because user is gone; deletedUserId stays in metadata).
    await this.audit.record({
      userId: null,
      action: AuditAction.AccountDeleted,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { deletedUserId: user.id, emailHash: hashEmail(user.email) },
    });
    this.logger.log(`Account deleted: ${user.id}`);
  }

  async logout(input: LogoutInput, ctx: RequestContext): Promise<void> {
    await this.revokeCurrentSession(input);
    this.logger.log(`Logout: user=${input.userId}`);
    await this.audit.record({
      userId: input.userId,
      action: AuditAction.Logout,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  private async revokeCurrentSession(input: LogoutInput): Promise<void> {
    const remaining = input.accessExpEpoch - Math.floor(Date.now() / 1000);
    // Blacklist access first (security-critical), then revoke refresh.
    await this.store.blacklistAccess(input.accessJti, Math.max(0, remaining));
    await this.store.revokeRefresh(input.userId, input.refreshJti);
  }

  private async issuePairFor(userId: string): Promise<IssuedTokens> {
    const issued = await this.tokens.issueTokenPair(userId);
    await this.store.whitelistRefresh(
      userId,
      issued.refreshJti,
      issued.tokens.refreshToken,
      REFRESH_TTL_SEC,
    );
    return issued.tokens;
  }
}
