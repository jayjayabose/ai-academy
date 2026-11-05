import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  JwtAuthGuard,
  type AuthenticatedUser,
  type TokenVerifier,
  extractBearerToken,
} from './auth.contract';

function contextWith(
  authorization: string | undefined,
  isPublic = false,
): { context: ExecutionContext; request: { headers: object; user?: unknown } } {
  const request: { headers: { authorization?: string }; user?: unknown } = {
    headers: { authorization },
  };
  const handler = () => undefined;
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  const context = {
    getHandler: () => handler,
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('extractBearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['  Bearer   abc  ', 'abc'],
  ])('reads %j', (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });

  it.each([undefined, '', 'Bearer', 'Basic abc', 'Bearer a b', 'abc'])(
    'rejects %j',
    (header) => {
      expect(extractBearerToken(header)).toBeNull();
    },
  );
});

describe('JwtAuthGuard', () => {
  const user = { id: 'u1', email: 'u1@example.com' };
  const verify = jest.fn<Promise<AuthenticatedUser>, [string]>();
  const verifier: TokenVerifier = { verify };
  const guard = new JwtAuthGuard(new Reflector(), verifier);

  beforeEach(() => verify.mockReset());

  it('attaches the verified user and allows the request', async () => {
    verify.mockResolvedValue(user);
    const { context, request } = contextWith('Bearer good');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('good');
    expect(request.user).toEqual(user);
  });

  it('rejects a request with no token without calling the verifier', async () => {
    await expect(
      guard.canActivate(contextWith(undefined).context),
    ).rejects.toThrow(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects when the verifier rejects', async () => {
    verify.mockRejectedValue(new Error('expired'));
    await expect(
      guard.canActivate(contextWith('Bearer stale').context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lets @Public() routes through without a token', async () => {
    await expect(
      guard.canActivate(contextWith(undefined, true).context),
    ).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });
});
