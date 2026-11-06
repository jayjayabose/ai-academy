import type { RegisterRequest } from '@ai-academy/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto implements RegisterRequest {
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  // bcrypt only reads the first 72 bytes; cap it so a longer password is not
  // silently truncated.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;
}
