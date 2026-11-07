import type { AppNotification } from '@ai-academy/shared';
import type { Notification } from './notification.model';

/** Model row to wire shape. Dates become ISO strings; nothing internal leaks (no updatedAt). */
export function toAppNotification(row: Notification): AppNotification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.isRead,
    leadId: row.leadId,
    createdAt: row.createdAt.toISOString(),
  };
}
