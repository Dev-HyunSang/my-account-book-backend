import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../src/auth/types';

function makeContext(headers: Record<string, string | undefined>): {
  ctx: ExecutionContext;
  req: { headers: Record<string, string | undefined>; user?: AuthenticatedUser };
} {
  const req: { headers: Record<string, string | undefined>; user?: AuthenticatedUser } = {
    headers,
  };
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('JwtAuthGuard', () => {
  let tokenService: { verifyAccessToken: jest.Mock };
  let tokenStore: { isAccessBlacklisted: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    tokenService = { verifyAccessToken: jest.fn() };
    tokenStore = { isAccessBlacklisted: jest.fn() };
    guard = new JwtAuthGuard(tokenService as never, tokenStore as never);
  });

  it('rejects when the Authorization header is missing', async () => {
    const { ctx } = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects when the scheme is not Bearer', async () => {
    const { ctx } = makeContext({ authorization: 'Basic abc123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects when the Bearer value is empty', async () => {
    const { ctx } = makeContext({ authorization: 'Bearer ' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('accepts case-insensitive bearer scheme', async () => {
    tokenService.verifyAccessToken.mockResolvedValue({
      sub: 'u-1',
      jti: 'a-1',
      refreshJti: 'r-1',
      exp: 1234567890,
      type: 'access',
    });
    tokenStore.isAccessBlacklisted.mockResolvedValue(false);
    const { ctx, req } = makeContext({ authorization: 'bearer token-x' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('token-x');
    expect(req.user).toEqual({
      userId: 'u-1',
      accessJti: 'a-1',
      refreshJti: 'r-1',
      accessExpEpoch: 1234567890,
    });
  });

  it('rejects when JWT verification throws', async () => {
    tokenService.verifyAccessToken.mockRejectedValue(new Error('jwt expired'));
    const { ctx } = makeContext({ authorization: 'Bearer expired' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(tokenStore.isAccessBlacklisted).not.toHaveBeenCalled();
  });

  it('rejects when the access JTI is blacklisted', async () => {
    tokenService.verifyAccessToken.mockResolvedValue({
      sub: 'u-1',
      jti: 'blacklisted-jti',
      refreshJti: 'r-1',
      exp: 1234567890,
      type: 'access',
    });
    tokenStore.isAccessBlacklisted.mockResolvedValue(true);
    const { ctx, req } = makeContext({ authorization: 'Bearer good-token' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(req.user).toBeUndefined();
  });
});
