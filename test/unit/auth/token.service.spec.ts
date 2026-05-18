import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../../../src/auth/services/token.service';

describe('TokenService', () => {
  let service: TokenService;

  const config = {
    get: (key: string) => {
      if (key === 'jwtAccessSecret') return 'access-secret-for-tests-32bytes!';
      if (key === 'jwtRefreshSecret') return 'refresh-secret-for-tests-32byte!';
      return undefined;
    },
  } as unknown as ConfigService;

  beforeEach(() => {
    service = new TokenService(new JwtService({}), config);
  });

  it('signs and verifies an access token roundtrip', async () => {
    const issued = await service.signAccessToken({
      userId: 'user-1',
      refreshJti: 'r-jti-1',
    });
    const claims = await service.verifyAccessToken(issued.token);
    expect(claims.sub).toBe('user-1');
    expect(claims.type).toBe('access');
    expect(claims.refreshJti).toBe('r-jti-1');
    expect(claims.jti).toBe(issued.jti);
  });

  it('signs and verifies a refresh token roundtrip', async () => {
    const issued = await service.signRefreshToken({ userId: 'user-1' });
    const claims = await service.verifyRefreshToken(issued.token);
    expect(claims.sub).toBe('user-1');
    expect(claims.type).toBe('refresh');
  });

  it('rejects when using access verifier on a refresh token', async () => {
    const issued = await service.signRefreshToken({ userId: 'user-1' });
    await expect(service.verifyAccessToken(issued.token)).rejects.toThrow();
  });

  it('rejects when using refresh verifier on an access token', async () => {
    const issued = await service.signAccessToken({
      userId: 'user-1',
      refreshJti: 'r-1',
    });
    await expect(service.verifyRefreshToken(issued.token)).rejects.toThrow();
  });

  it('rejects a tampered token', async () => {
    const issued = await service.signAccessToken({
      userId: 'user-1',
      refreshJti: 'r-1',
    });
    const tampered = issued.token.slice(0, -2) + 'aa';
    await expect(service.verifyAccessToken(tampered)).rejects.toThrow();
  });

  it('issueTokenPair links access.refreshJti to refresh.jti', async () => {
    const pair = await service.issueTokenPair('user-42');
    const access = await service.verifyAccessToken(pair.tokens.accessToken);
    const refresh = await service.verifyRefreshToken(pair.tokens.refreshToken);
    expect(access.refreshJti).toBe(refresh.jti);
    expect(access.refreshJti).toBe(pair.refreshJti);
  });
});
