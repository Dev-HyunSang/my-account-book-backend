import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from '../../../src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../src/auth/types';

// `createParamDecorator` returns a decorator factory; calling it stamps metadata
// onto a target class. We reach in to extract the underlying factory function
// so we can call it against a synthetic ExecutionContext.
function extractFactory(): (data: unknown, ctx: ExecutionContext) => AuthenticatedUser {
  class Probe {
    handler(@CurrentUser() _user: AuthenticatedUser) {
      void _user;
    }
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler');
  const entry = args[Object.keys(args)[0]];
  return entry.factory as (data: unknown, ctx: ExecutionContext) => AuthenticatedUser;
}

function makeContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser decorator', () => {
  const factory = extractFactory();

  it('returns the authenticated user attached to the request', () => {
    const user: AuthenticatedUser = {
      userId: 'u-1',
      accessJti: 'a-1',
      refreshJti: 'r-1',
      accessExpEpoch: 1234567890,
    };
    expect(factory(undefined, makeContext(user))).toEqual(user);
  });

  it('throws UnauthorizedException when req.user is absent', () => {
    expect(() => factory(undefined, makeContext(undefined))).toThrow(UnauthorizedException);
  });
});
