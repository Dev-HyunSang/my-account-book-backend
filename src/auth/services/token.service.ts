import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import {
  ACCESS_TTL_SEC,
  AccessClaims,
  IssuedTokens,
  REFRESH_TTL_SEC,
  RefreshClaims,
} from '../types';

interface SignAccessInput {
  userId: string;
  refreshJti: string;
}

interface SignRefreshInput {
  userId: string;
}

interface SignedToken<TClaims> {
  token: string;
  jti: string;
  expEpoch: number;
  claims: TClaims;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signAccessToken(input: SignAccessInput): Promise<SignedToken<AccessClaims>> {
    const jti = randomUUID();
    const payload = {
      sub: input.userId,
      jti,
      type: 'access' as const,
      refreshJti: input.refreshJti,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: ACCESS_TTL_SEC,
      algorithm: 'HS256',
    });
    const decoded = this.jwt.decode(token) as AccessClaims;
    return { token, jti, expEpoch: decoded.exp, claims: decoded };
  }

  async signRefreshToken(input: SignRefreshInput): Promise<SignedToken<RefreshClaims>> {
    const jti = randomUUID();
    const payload = {
      sub: input.userId,
      jti,
      type: 'refresh' as const,
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: REFRESH_TTL_SEC,
      algorithm: 'HS256',
    });
    const decoded = this.jwt.decode(token) as RefreshClaims;
    return { token, jti, expEpoch: decoded.exp, claims: decoded };
  }

  async issueTokenPair(userId: string): Promise<{
    tokens: IssuedTokens;
    accessJti: string;
    refreshJti: string;
    accessExpEpoch: number;
    refreshExpEpoch: number;
  }> {
    const refresh = await this.signRefreshToken({ userId });
    const access = await this.signAccessToken({
      userId,
      refreshJti: refresh.jti,
    });
    return {
      tokens: { accessToken: access.token, refreshToken: refresh.token },
      accessJti: access.jti,
      refreshJti: refresh.jti,
      accessExpEpoch: access.expEpoch,
      refreshExpEpoch: refresh.expEpoch,
    };
  }

  async verifyAccessToken(token: string): Promise<AccessClaims> {
    const payload = await this.jwt.verifyAsync<AccessClaims>(token, {
      secret: this.accessSecret,
      algorithms: ['HS256'],
    });
    if (payload.type !== 'access') {
      throw new Error('Token type mismatch');
    }
    return payload;
  }

  async verifyRefreshToken(token: string): Promise<RefreshClaims> {
    const payload = await this.jwt.verifyAsync<RefreshClaims>(token, {
      secret: this.refreshSecret,
      algorithms: ['HS256'],
    });
    if (payload.type !== 'refresh') {
      throw new Error('Token type mismatch');
    }
    return payload;
  }

  private get accessSecret(): string {
    const secret = this.config.get<string>('jwtAccessSecret');
    if (!secret) {
      throw new Error('jwtAccessSecret is not configured');
    }
    return secret;
  }

  private get refreshSecret(): string {
    const secret = this.config.get<string>('jwtRefreshSecret');
    if (!secret) {
      throw new Error('jwtRefreshSecret is not configured');
    }
    return secret;
  }
}
