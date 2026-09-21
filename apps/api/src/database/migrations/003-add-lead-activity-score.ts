// Migration: add the activity score columns to leads
// Feature: Day 2 lead activity scoring
// Date: 2026-09-21
// Spec: .claude/workspace/lead-activity-scoring/agent-prompts/backend-activity-score.md
//
// Trap #5 once more: QueryInterface does NOT apply Sequelize's `underscored`
// option. Both column names here are spelled snake_case BY HAND. See the header
// of migration 001.
//
// No value set to hardcode this time — a score is a number, not a member of a
// union — so the seam value-set-constraints.integration.spec.ts closes does not
// widen here. The range CHECK below is the equivalent guard, and it is tested in
// the same file for the same reason: nothing in TypeScript links 0..100 to this
// SQL.
//
// Two nullable columns on `leads` rather than a `lead_scores` table, for the
// reason migration 002 gave about summaries: a score has no identity or
// lifecycle of its own — one per lead, replaced wholesale, gone with the lead.
import { DataTypes, Op } from 'sequelize';
import type { Migration } from '../migrate';

/**
 * Either both score columns are populated or neither is.
 *
 * The same complete-or-absent shape as `leads_summary_complete_check`, and it
 * buys the same thing: lead-wire.ts can treat one populated field as proof of
 * the other, rather than carrying two independent maybes for a pair that is
 * only ever written together. It also makes the distinction the wire contract
 * rests on enforceable — null is "never scored", and a score with no timestamp
 * would be a third state nobody has a rendering for.
 */
const COMPLETE_OR_ABSENT = `num_nonnulls(activity_score, score_calculated_at) IN (0, 2)`;

export const up: Migration = async ({ context: queryInterface }) => {
  // INTEGER, not NUMERIC or SMALLINT: the pg driver returns INTEGER as a real
  // number and NUMERIC as a string, and "87" on the wire would sort
  // lexicographically in the list. Same reasoning as `budget` in migration 001.
  await queryInterface.addColumn('leads', 'activity_score', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  // TIMESTAMPTZ, like summary_generated_at. The server stamps it, so there is
  // no default — an unscored lead has no timestamp.
  await queryInterface.addColumn('leads', 'score_calculated_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });

  // The scorer clamps to 0..100 in TypeScript; this is the guard for everything
  // that does not go through the scorer — a hand-edit in psql, a future bug, a
  // reweighting that forgets to renormalise. NULL passes, because a CHECK fails
  // only when its expression is FALSE.
  await queryInterface.addConstraint('leads', {
    fields: ['activity_score'],
    type: 'check',
    name: 'leads_activity_score_range_check',
    where: { activity_score: { [Op.between]: [0, 100] } },
  });

  // Raw SQL, not addConstraint: `where` builds a column predicate and cannot
  // express a call to num_nonnulls().
  await queryInterface.sequelize.query(
    `ALTER TABLE leads ADD CONSTRAINT leads_activity_score_complete_check
       CHECK (${COMPLETE_OR_ABSENT})`,
  );
};

export const down: Migration = async ({ context: queryInterface }) => {
  // Constraints first. Dropping the columns would take them along, but naming
  // them here keeps `down` readable as the exact inverse of `up`.
  await queryInterface.sequelize.query(
    `ALTER TABLE leads DROP CONSTRAINT leads_activity_score_complete_check`,
  );
  await queryInterface.removeConstraint(
    'leads',
    'leads_activity_score_range_check',
  );

  for (const column of ['activity_score', 'score_calculated_at']) {
    await queryInterface.removeColumn('leads', column);
  }
};
