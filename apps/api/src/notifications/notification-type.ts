import type { NotificationType } from '@ai-academy/shared';

type AssertEmpty<T extends never> = T;

/**
 * Runtime mirror of the shared union (types-only package, D6). Migration 005
 * hardcodes the same set; value-set-constraints.integration.spec.ts links them.
 */
export const NOTIFICATION_TYPES = [
  'lead_created',
  'task_completed',
  'score_updated',
  'comment_added',
] as const satisfies readonly NotificationType[];

// Fails to compile if a NotificationType member is missing from the list above.
export type _NotificationTypeExhaustive = AssertEmpty<
  Exclude<NotificationType, (typeof NOTIFICATION_TYPES)[number]>
>;
