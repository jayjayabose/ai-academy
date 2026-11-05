import type { AppNotification, UnreadCountResponse } from '@ai-academy/shared';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from '../auth/auth.contract';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

/**
 * Explicit guard: the global one arrives with the auth branch, and a second pass
 * is harmless. Static routes (`unread-count`, `read-all`) are declared BEFORE the
 * `:id` routes so a parameter can never capture them.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<AppNotification[]> {
    return this.notifications.list(user.id, query.limit);
  }

  @Get('unread-count')
  unreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnreadCountResponse> {
    return this.notifications.unreadCount(user.id);
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnreadCountResponse> {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppNotification> {
    return this.notifications.markRead(user.id, id);
  }

  @Patch(':id/unread')
  markUnread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppNotification> {
    return this.notifications.markUnread(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.notifications.remove(user.id, id);
  }
}
