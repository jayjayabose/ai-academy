// Migration: create the leads and interactions tables
// Feature: Day 1 core CRM data model
// Date: 2026-08-06
// Spec: notes/day_01_contract.md
//
// Trap #5: QueryInterface does NOT apply Sequelize's `underscored` option.
// Every column name here is spelled snake_case BY HAND. The models declare the
// camelCase attributes; the mapping comes from `define: { underscored: true }`
// in database.module.ts. Getting this wrong fails silently — the model simply
// cannot find its columns at runtime.
//
// Value sets are HARDCODED here on purpose, not imported from
// apps/api/src/leads/lead-status.ts. A migration is a historical record: if it
// imported a mutable constant, editing that constant later would retroactively
// change what this migration meant. The cost is that nothing links the
// TypeScript unions to this SQL — which is exactly why the SQLSTATE 23514
// integration test exists.
import { DataTypes, Sequelize } from 'sequelize';
import type { Migration } from '../migrate';

const LEAD_STATUSES = ['active', 'contacted', 'qualified', 'closed', 'lost'];
const PROPERTY_TYPES = ['single-family', 'condo', 'townhouse', 'multi-family', 'land'];
const INTERACTION_TYPES = ['call', 'email', 'meeting', 'note'];

const timestamps = {
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
};

export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable('leads', {
        // gen_random_uuid() is built into Postgres 13+; no pgcrypto extension needed.
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        first_name: { type: DataTypes.STRING(100), allowNull: false },
        last_name: { type: DataTypes.STRING(100), allowNull: false },
        email: { type: DataTypes.STRING(255), allowNull: false },
        phone: { type: DataTypes.STRING(30), allowNull: true },
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'active',
        },
        // INTEGER, not NUMERIC/BIGINT: the pg driver returns those as strings,
        // which would make `budget: number` in the contract a lie at runtime.
        budget: { type: DataTypes.INTEGER, allowNull: true },
        // Nullable: rarely known at first contact.
        location: { type: DataTypes.STRING(100), allowNull: true },
        property_type: { type: DataTypes.STRING(20), allowNull: true },
        // NULL for `land` — "not applicable", as distinct from zero.
        bedrooms: { type: DataTypes.INTEGER, allowNull: true },
        source: { type: DataTypes.STRING(30), allowNull: true },
        // DATE, not TIMESTAMPTZ: a date with no meaningful time. Storing it as a
        // timestamp fabricates midnight UTC, which renders as the PREVIOUS day
        // for anyone in a US timezone.
        inquiry_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_DATE'),
        },
        notes: { type: DataTypes.TEXT, allowNull: true },
        ...timestamps,
    });

    await queryInterface.createTable('interactions', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
        },
        // Composition: an interaction cannot exist without its lead.
        lead_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'leads', key: 'id' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        type: { type: DataTypes.STRING(20), allowNull: false },
        // TIMESTAMPTZ: a genuine instant, unlike leads.inquiry_date.
        occurred_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('now()'),
        },
        notes: { type: DataTypes.TEXT, allowNull: true },
        ...timestamps,
    });

    // Decision 12: VARCHAR + named CHECK, never a native Postgres enum — there is
    // no ALTER TYPE ... DROP VALUE, so an enum would make db:migrate:undo a lie.
    // Names are explicit because `down` needs a stable identifier to drop, and
    // Sequelize's auto-generated names are inconsistent.
    //
    // A CHECK passes when its expression is not FALSE, so NULL passes — which is
    // what we want for the nullable property_type.
    await queryInterface.addConstraint('leads', {
        fields: ['status'],
        type: 'check',
        name: 'leads_status_check',
        where: { status: LEAD_STATUSES },
    });

    await queryInterface.addConstraint('leads', {
        fields: ['property_type'],
        type: 'check',
        name: 'leads_property_type_check',
        where: { property_type: PROPERTY_TYPES },
    });

    await queryInterface.addConstraint('interactions', {
        fields: ['type'],
        type: 'check',
        name: 'interactions_type_check',
        where: { type: INTERACTION_TYPES },
    });

    // Every lead-detail request joins on this one.
    await queryInterface.addIndex('interactions', ['lead_id'], {
        name: 'interactions_lead_id_idx',
    });

    // Not unique: couples share an address, and the same person can inquire twice.
    await queryInterface.addIndex('leads', ['email'], { name: 'leads_email_idx' });
};

export const down: Migration = async ({ context: queryInterface }) => {
    // Interactions first — it holds the FK. Dropping the tables takes their
    // constraints and indexes with them.
    await queryInterface.dropTable('interactions');
    await queryInterface.dropTable('leads');
};
