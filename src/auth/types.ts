export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;

export interface AccessClaims {
  sub: string;
  jti: string;
  type: 'access';
  refreshJti: string;
  iat: number;
  exp: number;
}

export interface RefreshClaims {
  sub: string;
  jti: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface AuthenticatedUser {
  userId: string;
  accessJti: string;
  refreshJti: string;
  accessExpEpoch: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
}
