import type { TokenVerifier } from '../auth/auth.contract';
import { authenticateSocket } from './notifications.gateway';

type Middleware = ReturnType<typeof authenticateSocket>;
type FakeSocket = Parameters<Middleware>[0];

function fakeSocket(auth: unknown): {
  socket: FakeSocket;
  join: jest.Mock;
  data: Record<string, unknown>;
} {
  const join = jest.fn().mockResolvedValue(undefined);
  const data: Record<string, unknown> = {};
  const socket = { handshake: { auth }, join, data } as unknown as FakeSocket;
  return { socket, join, data };
}

describe('authenticateSocket (namespace middleware)', () => {
  const verifier = { verify: jest.fn() } satisfies TokenVerifier;
  let middleware: Middleware;

  beforeEach(() => {
    verifier.verify.mockReset();
    middleware = authenticateSocket(verifier);
  });

  it('joins the user room and attaches the user for a valid token', async () => {
    const user = { id: 'u1', email: 'u1@dev.local' };
    verifier.verify.mockResolvedValue(user);
    const { socket, join, data } = fakeSocket({ token: 'good' });
    const next = jest.fn();

    await middleware(socket, next);

    expect(verifier.verify).toHaveBeenCalledWith('good');
    expect(data.user).toEqual(user);
    expect(join).toHaveBeenCalledWith('user:u1');
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['no auth payload', undefined],
    ['no token', {}],
    ['an empty token', { token: '' }],
    ['a non-string token', { token: 42 }],
  ])(
    'rejects %s with Unauthorized without calling the verifier',
    async (_n, auth) => {
      const { socket, join } = fakeSocket(auth);
      const next = jest.fn();

      await middleware(socket, next);

      expect(next).toHaveBeenCalledWith(new Error('Unauthorized'));
      expect(verifier.verify).not.toHaveBeenCalled();
      expect(join).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid token with the same Unauthorized message', async () => {
    verifier.verify.mockRejectedValue(new Error('jwt malformed'));
    const { socket, join } = fakeSocket({ token: 'bad' });
    const next = jest.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(new Error('Unauthorized'));
    expect(join).not.toHaveBeenCalled();
  });
});
