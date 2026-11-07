import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { UniqueConstraintError } from 'sequelize';
import { AuthService } from './auth.service';
import type { User } from './user.model';

/** Unit tier: the model and JwtService are mocks; bcrypt is real so hashing is genuinely exercised. */

type UsersMock = {
  findOne: jest.Mock;
  findByPk: jest.Mock;
  create: jest.Mock;
};

function storedUser(overrides: Partial<User> = {}): User {
  return {
    id: '9b0b8e2a-0000-4000-8000-000000000001',
    email: 'ada@example.com',
    passwordHash: 'stored-hash',
    firstName: 'Ada',
    lastName: 'Lovelace',
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let users: UsersMock;
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    users = { findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    service = new AuthService(
      users as unknown as typeof User,
      jwt as unknown as JwtService,
    );
  });

  const registration = {
    email: '  Ada@Example.COM ',
    password: 'correct-horse',
    firstName: ' Ada ',
    lastName: 'Lovelace',
  };

  describe('register', () => {
    it('lowercases and trims the email, hashes the password and signs sub + email', async () => {
      users.findOne.mockResolvedValue(null);
      users.create.mockImplementation((values: Partial<User>) =>
        Promise.resolve(storedUser(values)),
      );

      const result = await service.register(registration);

      expect(users.findOne).toHaveBeenCalledWith({
        where: { email: 'ada@example.com' },
      });
      const created = (users.create.mock.calls[0] as [Partial<User>])[0];
      expect(created.email).toBe('ada@example.com');
      expect(created.firstName).toBe('Ada');
      expect(created.passwordHash).not.toBe('correct-horse');
      expect(await compare('correct-horse', created.passwordHash ?? '')).toBe(
        true,
      );
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: '9b0b8e2a-0000-4000-8000-000000000001',
        email: 'ada@example.com',
      });
      expect(result.token).toBe('signed.jwt.token');
    });

    it('never returns the password hash', async () => {
      users.findOne.mockResolvedValue(null);
      users.create.mockImplementation((values: Partial<User>) =>
        Promise.resolve(storedUser(values)),
      );

      const result = await service.register(registration);

      expect(JSON.stringify(result)).not.toContain('passwordHash');
      expect(Object.keys(result.user).sort()).toEqual([
        'email',
        'firstName',
        'id',
        'lastName',
      ]);
    });

    it('answers 409 when the email is already registered', async () => {
      users.findOne.mockResolvedValue(storedUser());

      await expect(service.register(registration)).rejects.toThrow(
        ConflictException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });

    it('answers 409 when the unique index wins a race', async () => {
      users.findOne.mockResolvedValue(null);
      users.create.mockRejectedValue(new UniqueConstraintError({}));

      await expect(service.register(registration)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('returns a token and user for the right password', async () => {
      users.findOne.mockResolvedValue(
        storedUser({ passwordHash: await hash('correct-horse', 4) }),
      );

      const result = await service.login({
        email: 'ADA@example.com',
        password: 'correct-horse',
      });

      expect(users.findOne).toHaveBeenCalledWith({
        where: { email: 'ada@example.com' },
      });
      expect(result.token).toBe('signed.jwt.token');
      expect(JSON.stringify(result)).not.toContain('passwordHash');
    });

    it('answers 401 "Invalid credentials" for a wrong password', async () => {
      users.findOne.mockResolvedValue(
        storedUser({ passwordHash: await hash('correct-horse', 4) }),
      );

      const error = await service
        .login({ email: 'ada@example.com', password: 'wrong-password' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).toBe(
        'Invalid credentials',
      );
    });

    it('answers identically for an unknown user as for a wrong password', async () => {
      users.findOne.mockResolvedValue(
        storedUser({ passwordHash: await hash('correct-horse', 4) }),
      );
      const wrongPassword = await service
        .login({ email: 'ada@example.com', password: 'wrong-password' })
        .catch((e: unknown) => e as UnauthorizedException);

      users.findOne.mockResolvedValue(null);
      const unknownUser = await service
        .login({ email: 'nobody@example.com', password: 'wrong-password' })
        .catch((e: unknown) => e as UnauthorizedException);

      expect(unknownUser).toBeInstanceOf(UnauthorizedException);
      expect((unknownUser as UnauthorizedException).message).toBe(
        (wrongPassword as UnauthorizedException).message,
      );
      expect((unknownUser as UnauthorizedException).getStatus()).toBe(
        (wrongPassword as UnauthorizedException).getStatus(),
      );
    });

    it('still spends a bcrypt comparison when the user does not exist', async () => {
      users.findOne.mockResolvedValue(null);

      const started = Date.now();
      await service
        .login({ email: 'nobody@example.com', password: 'whatever-1' })
        .catch(() => undefined);

      // A cost-10 compare takes tens of milliseconds; a skipped one takes ~0.
      expect(Date.now() - started).toBeGreaterThan(10);
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('returns the public user without the hash', async () => {
      users.findByPk.mockResolvedValue(storedUser());

      expect(await service.me('9b0b8e2a-0000-4000-8000-000000000001')).toEqual({
        id: '9b0b8e2a-0000-4000-8000-000000000001',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    });

    it('answers 401 when the token belongs to a deleted user', async () => {
      users.findByPk.mockResolvedValue(null);

      await expect(service.me('gone')).rejects.toThrow(UnauthorizedException);
    });
  });
});
