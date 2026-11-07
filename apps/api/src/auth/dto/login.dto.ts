import type { LoginRequest } from '@ai-academy/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto implements LoginRequest {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail()
  email!: string;

  // No length rule on login: a wrong-length password must read as "Invalid
  // credentials", not as a validation hint about the password policy.
  @IsString()
  @IsNotEmpty()
  password!: string;
}
