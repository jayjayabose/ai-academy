import type { AppNotification, UnreadCountResponse } from '@ai-academy/shared';
import type { NotificationType } from '@ai-academy/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { DEFAULT_NOTIFICATION_LIMIT } from './dto/list-notifications-query.dto';
import { Notification } from './notification.model';
import { toAppNotification } from './notification-wire';
import { NotificationsGateway } from './notifications.gateway';

export interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  leadId?: string | null;
}

/**
 * Persist AND emit. Every read/write is scoped by the caller's userId in the
 * WHERE clause itself, so another user's row is simply "not found" (404, not 403
 * — ids are not probeable).
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification)
    private readonly notifications: typeof Notification,
    private readonly sequelize: Sequelize,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * One row per user, inserted in a single statement, THEN emitted: a socket
   * event for a row that failed to commit would be a toast for nothing.
   * Recipients come from raw SQL because the User model belongs to the auth branch.
   */
  async notifyAllUsers(input: NotifyInput): Promise<AppNotification[]> {
    const users = await this.sequelize.query<{ id: string }>(
      'SELECT id FROM users',
      { type: QueryTypes.SELECT },
    );
    if (users.length === 0) return [];

    const rows = await this.notifications.bulkCreate(
      users.map((user) => ({
        userId: user.id,
        type: input.type,
        title: input.title,
        message: input.message,
        leadId: input.leadId ?? null,
      })),
    );

    for (const row of rows) {
      this.gateway.emitNotification(row.userId, toAppNotification(row));
      await this.emitUnreadCount(row.userId);
    }

    return rows.map(toAppNotification);
  }

  async list(
    userId: string,
    limit: number = DEFAULT_NOTIFICATION_LIMIT,
  ): Promise<AppNotification[]> {
    const rows = await this.notifications.findAll({
      where: { userId },
      // id breaks ties: a broadcast inserts every row in one statement.
      order: [
        ['createdAt', 'DESC'],
        ['id', 'ASC'],
      ],
      limit,
    });

    return rows.map(toAppNotification);
  }

  async unreadCount(userId: string): Promise<UnreadCountResponse> {
    return {
      count: await this.notifications.count({
        where: { userId, isRead: false },
      }),
    };
  }

  markRead(userId: string, id: string): Promise<AppNotification> {
    return this.setRead(userId, id, true);
  }

  markUnread(userId: string, id: string): Promise<AppNotification> {
    return this.setRead(userId, id, false);
  }

  async markAllRead(userId: string): Promise<UnreadCountResponse> {
    await this.notifications.update(
      { isRead: true },
      { where: { userId, isRead: false } },
    );

    return this.emitUnreadCount(userId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const row = await this.findOwnedOrFail(userId, id);
    await row.destroy();
    await this.emitUnreadCount(userId);
  }

  private async setRead(
    userId: string,
    id: string,
    isRead: boolean,
  ): Promise<AppNotification> {
    const row = await this.findOwnedOrFail(userId, id);
    await row.update({ isRead });
    await this.emitUnreadCount(userId);

    return toAppNotification(row);
  }

  private async findOwnedOrFail(
    userId: string,
    id: string,
  ): Promise<Notification> {
    const row = await this.notifications.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException(`Notification ${id} not found`);

    return row;
  }

  private async emitUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const payload = await this.unreadCount(userId);
    this.gateway.emitUnreadCount(userId, payload);

    return payload;
  }
}
