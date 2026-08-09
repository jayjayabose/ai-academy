// Migration: add the AI-generated summary columns to leads
// Feature: Day 2 AI lead summaries
// Date: 2026-08-09
// Spec: .claude/workspace/ai-lead-summaries/agent-prompts/backend-summary-endpoint.md
//
// Trap #5 again: QueryInterface does NOT apply Sequelize's `underscored` option.
// Every column name here is spelled snake_case BY HAND. See the header of
// migration 001.
//
// The urgency value set is HARDCODED here, exactly as migration 001 hardcodes
// its own, and for the same reason: a migration is a historical record, so
// importing the mutable SUMMARY_URGENCIES would let a later edit retroactively
// change what this migration meant. value-set-constraints.integration.spec.ts is
// what closes the resulting seam.
//
// Five nullable columns rather than a `summaries` table: a summary has no
// identity or lifecycle of its own — there is exactly one per lead, it is
// replaced wholesale, and it dies with the lead. A child table would buy a join
// and an id nobody needs.
import { DataTypes } from 'sequelize';
import type { Migration } from '../migrate';

const SUMMARY_URGENCIES = ['low', 'medium', 'high'];

/**
 * Either all five summary columns are populated or none of them are.
 *
 * Without this, a partial write — a crash between two UPDATEs, a hand-edit in
 * psql, a future bug — leaves a row the wire contract cannot express, since
 * `LeadSummary` has no optional fields. The mapper in lead-wire.ts leans on this
 * being enforced: it treats one populated field as proof of the other four.
 */
const COMPLETE_OR_ABSENT = `num_nonnulls(summary_narrative, summary_next_action, summary_urgency,
             summary_generated_at, summary_model) IN (0, 5)`;

export const up: Migration = async ({ context: queryInterface }) => {
  await queryInterface.addColumn('leads', 'summary_narrative', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.addColumn('leads', 'summary_next_action', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await queryInterface.addColumn('leads', 'summary_urgency', {
    type: DataTypes.STRING(10),
    allowNull: true,
  });

  // TIMESTAMPTZ: a genuine instant, like interactions.occurred_at. The server
  // stamps it, so there is no default — an absent summary has no timestamp.
  await queryInterface.addColumn('leads', 'summary_generated_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await queryInterface.addColumn('leads', 'summary_model', {
    type: DataTypes.STRING(50),
    allowNull: true,
  });

  // D12: VARCHAR + named CHECK, never a native Postgres enum. NULL passes,
  // because a CHECK fails only when its expression is FALSE.
  await queryInterface.addConstraint('leads', {
    fields: ['summary_urgency'],
    type: 'check',
    name: 'leads_summary_urgency_check',
    where: { summary_urgency: SUMMARY_URGENCIES },
  });

  // Raw SQL, not addConstraint: `where` builds a column-in-set predicate and
  // cannot express a call to num_nonnulls().
  await queryInterface.sequelize.query(
    `ALTER TABLE leads ADD CONSTRAINT leads_summary_complete_check
       CHECK (${COMPLETE_OR_ABSENT})`,
  );
};

export const down: Migration = async ({ context: queryInterface }) => {
  // Constraints first. Dropping the columns would take them along, but naming
  // them here keeps `down` readable as the exact inverse of `up`.
  await queryInterface.sequelize.query(
    `ALTER TABLE leads DROP CONSTRAINT leads_summary_complete_check`,
  );
  await queryInterface.removeConstraint('leads', 'leads_summary_urgency_check');

  for (const column of [
    'summary_narrative',
    'summary_next_action',
    'summary_urgency',
    'summary_generated_at',
    'summary_model',
  ]) {
    await queryInterface.removeColumn('leads', column);
  }
};
