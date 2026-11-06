import type { AuthResponse, User as UserResource } from '@ai-academy/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { type AuthenticatedUser, CurrentUser, Public } from './auth.contract';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Mounted at /api/auth. Register and login are public; `me` goes through the global guard. */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto);
  }

  // @Post defaults to 201; logging in creates nothing, so 200.
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResource> {
    return this.auth.me(user.id);
  }
}
