// Migration: create the users table
// Feature: Day 3 JWT authentication (Phase 0 contract — owned by the orchestrator)
// Date: 2026-11-05
// Spec: .claude/workspace/auth-and-notifications/execution-plan.md (ai-academy repo)
//
// Written in Phase 0, before either parallel agent starts, because the notifications
// table (migration 005) holds a foreign key to users and its agent must be able to
// migrate without waiting for the auth agent. The auth agent owns the User MODEL;
// this file is only the schema it maps onto.
//
// Trap #5: QueryInterface does NOT apply `underscored`. Column names are spelled
// snake_case by hand, as in migration 001.
//
// Email uniqueness is enforced on the stored value. The auth service must lowercase
// and trim before insert and before lookup — a case-insensitive index would hide a
// service bug rather than expose it.
import { DataTypes, Sequelize } from 'sequelize';
import type { Migration } from '../migrate';

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    // bcrypt output is 60 chars; 255 leaves room for a future algorithm.
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
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
};

export const down: Migration = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('users');
};
