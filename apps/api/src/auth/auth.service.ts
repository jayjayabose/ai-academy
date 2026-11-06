import type { AuthResponse, User as UserResource } from '@ai-academy/shared';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import { hash, compare } from 'bcrypt';
import { UniqueConstraintError } from 'sequelize';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { User } from './user.model';

const BCRYPT_COST = 10;

/** One message for unknown email and wrong password, so the response cannot be used to enumerate accounts. */
const INVALID_CREDENTIALS = 'Invalid credentials';

/**
 * A real bcrypt hash (cost 10) of a throwaway string. Compared against when the
 * email is unknown, so that path spends the same time as a wrong password.
 */
const DUMMY_HASH =
  '$2b$10$l2rycXkqSh4QHI/Cb62zXeZVHlm0cnfR9UACp.Auhi3mr2XeQyy.a';

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The wire shape. Built field by field so `passwordHash` cannot ride along. */
export function toUserResource(user: User): UserResource {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly users: typeof User,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = normaliseEmail(dto.email);

    if (await this.users.findOne({ where: { email } })) {
      throw new ConflictException('Email already in use');
    }

    let user: User;
    try {
      user = await this.users.create({
        email,
        passwordHash: await hash(dto.password, BCRYPT_COST),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      });
    } catch (error) {
      // Two simultaneous registrations both pass the check above; the unique
      // index is the real arbiter.
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }

    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findOne({
      where: { email: normaliseEmail(dto.email) },
    });

    // Always run one bcrypt comparison, whether or not the user exists.
    const matches = await compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !matches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.issue(user);
  }

  async me(userId: string): Promise<UserResource> {
    const user = await this.users.findByPk(userId);
    // A valid token for a user that no longer exists is not a valid session.
    if (!user) throw new UnauthorizedException('Unauthorized');
    return toUserResource(user);
  }

  private async issue(user: User): Promise<AuthResponse> {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { token, user: toUserResource(user) };
  }
}
