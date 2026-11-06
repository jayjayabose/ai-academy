import { JwtService } from '@nestjs/jwt';
import { JwtTokenVerifier } from './jwt-token-verifier';

const SECRET = 'unit-test-secret-that-is-at-least-32-chars';

describe('JwtTokenVerifier', () => {
  const signer = new JwtService({ secret: SECRET });
  const verifier = new JwtTokenVerifier(new JwtService({ secret: SECRET }));

  it('resolves { id, email } from a valid token', async () => {
    const token = await signer.signAsync(
      { sub: 'user-1', email: 'ada@example.com' },
      { expiresIn: '1h' },
    );

    await expect(verifier.verify(token)).resolves.toEqual({
      id: 'user-1',
      email: 'ada@example.com',
    });
  });

  it('rejects an expired token', async () => {
    const token = await signer.signAsync(
      { sub: 'user-1', email: 'ada@example.com' },
      { expiresIn: '-10s' },
    );

    await expect(verifier.verify(token)).rejects.toThrow(/expired/i);
  });

  it('rejects a tampered payload', async () => {
    const token = await signer.signAsync(
      { sub: 'user-1', email: 'ada@example.com' },
      { expiresIn: '1h' },
    );
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'someone-else', email: 'x@example.com' }),
    ).toString('base64url');

    await expect(
      verifier.verify(`${header}.${forged}.${signature}`),
    ).rejects.toThrow();
  });

  it('rejects a token signed with another secret', async () => {
    const other = new JwtService({
      secret: 'a-completely-different-32-char-secret!!',
    });
    const token = await other.signAsync({ sub: 'user-1', email: 'a@b.co' });

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it('rejects an unsigned (alg none) token', async () => {
    const b64 = (value: object): string =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'user-1', email: 'a@b.co' })}.`;

    await expect(verifier.verify(token)).rejects.toThrow();
  });

  it.each(['', 'not-a-jwt', 'a.b.c', 'Bearer abc'])(
    'rejects the malformed token %p',
    async (token) => {
      await expect(verifier.verify(token)).rejects.toThrow();
    },
  );

  it('rejects a validly signed token that lacks the sub claim', async () => {
    const token = await signer.signAsync({ email: 'ada@example.com' });

    await expect(verifier.verify(token)).rejects.toThrow(/sub/);
  });
});
