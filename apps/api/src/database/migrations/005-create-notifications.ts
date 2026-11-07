// Migration: create the notifications table
// Feature: Day 3 real-time notifications
// Date: 2026-11-05
// Spec: .claude/workspace/auth-and-notifications/route-map.md (ai-academy repo)
//
// One row per RECIPIENT: a lead_created broadcast to three users is three rows,
// so read/unread/delete state is per user and every query scopes on user_id.
//
// Trap #5: QueryInterface does NOT apply `underscored`. Column names are spelled
// snake_case by hand, as in migration 001.
//
// The type set is HARDCODED here on purpose, not imported from
// packages/shared: a migration is a historical record, and the integration test
// value-set-constraints.integration.spec.ts is what links it to the TypeScript
// union (SQLSTATE 23514).
import { DataTypes, Sequelize } from 'sequelize';
import type { Migration } from '../migrate';

const NOTIFICATION_TYPES = [
  'lead_created',
  'task_completed',
  'score_updated',
  'comment_added',
];

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('notifications', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    // A notification belongs to its recipient and dies with them.
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    type: { type: DataTypes.STRING(30), allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Aggregation, not composition: deleting a lead keeps the history line,
    // it just stops linking anywhere.
    lead_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'leads', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('now()'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('now()'),
    },
  });

  await queryInterface.addConstraint('notifications', {
    fields: ['type'],
    type: 'check',
    name: 'notifications_type_check',
    where: { type: NOTIFICATION_TYPES },
  });

  // The list query: one user's rows, newest first.
  await queryInterface.sequelize.query(
    'CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC)',
  );

  // The badge query. Partial: it only ever counts unread rows, and most rows
  // are read.
  await queryInterface.addIndex('notifications', ['user_id'], {
    name: 'notifications_user_unread_idx',
    where: { is_read: false },
  });
};

export const down: Migration = async ({ context: queryInterface }) => {
  // Dropping the table takes its constraints and indexes with it.
  await queryInterface.dropTable('notifications');
};
