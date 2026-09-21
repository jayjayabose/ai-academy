import {
  setupTestDatabase,
  teardownTestDatabase,
  testConnection,
  truncateAll,
} from '@test/helpers';
import { QueryTypes } from 'sequelize';
import { INTERACTION_TYPES } from '../interactions/interaction-type';
import { LEAD_STATUSES, PROPERTY_TYPES } from '../leads/lead-status';
import { SUMMARY_URGENCIES } from '../leads/summary-urgency';

/**
 * The only thing linking the TypeScript unions to the migrations' SQL.
 *
 * The migrations hardcode their value sets instead of importing LEAD_STATUSES and
 * friends, and that is correct: a migration is a historical record, so importing
 * a mutable constant would let a later edit retroactively change what the
 * migration meant. The cost is a seam — add a member to a union, forget the
 * migration, and nothing complains until the first INSERT in production.
 *
 * This closes it. Every union member must insert, and one value that is in no
 * union must fail with SQLSTATE 23514 (check_violation) naming the constraint.
 * It runs against crm_test, whose schema is built by the migrations themselves
 * (D8) — so a missing migration fails here rather than on a fresh clone.
 *
 * Every statement is RAW SQL on purpose. Lead.create() would be stopped by the
 * model's own `validate.isIn` before Postgres ever saw the row, which would
 * make this a test of sequelize-typescript instead of a test of the schema.
 *
 * The helpers live below the tests; they are plumbing, not specification.
 */
describe('the migrations value-set constraints', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('leads_status_check', () => {
    it.each([...LEAD_STATUSES])(
      'accepts the LeadStatus member %s',
      async (status) => {
        const id = await insertLead(status);

        expect(await storedLeadColumn(id, 'status')).toBe(status);
      },
    );

    it('rejects a value outside the union with check_violation', async () => {
      await expect(insertLead('not-a-status')).rejects.toMatchObject({
        parent: { code: CHECK_VIOLATION, constraint: 'leads_status_check' },
      });
    });
  });

  describe('leads_property_type_check', () => {
    it.each([...PROPERTY_TYPES])(
      'accepts the PropertyType member %s',
      async (propertyType) => {
        const id = await insertLead('active', propertyType);

        expect(await storedLeadColumn(id, 'property_type')).toBe(propertyType);
      },
    );

    it('stores NULL rather than rejecting it, because property_type is optional', async () => {
      // A CHECK passes unless its expression is FALSE, and `NULL IN (...)` is
      // NULL, not FALSE. Migration 001 relies on that instead of a separate
      // `OR property_type IS NULL` clause — worth pinning down, since it is what
      // makes the nullable column workable at all.
      const id = await insertLead('active', null);

      expect(await storedLeadColumn(id, 'property_type')).toBeNull();
    });

    it('rejects a value outside the union with check_violation', async () => {
      await expect(insertLead('active', 'houseboat')).rejects.toMatchObject({
        parent: {
          code: CHECK_VIOLATION,
          constraint: 'leads_property_type_check',
        },
      });
    });
  });

  describe('leads_summary_urgency_check', () => {
    it.each([...SUMMARY_URGENCIES])(
      'accepts the SummaryUrgency member %s',
      async (urgency) => {
        const id = await insertSummarisedLead(urgency);

        expect(await storedLeadColumn(id, 'summary_urgency')).toBe(urgency);
      },
    );

    it('stores NULL, because a lead that has never been summarised is normal', async () => {
      const id = await insertLead('active');

      expect(await storedLeadColumn(id, 'summary_urgency')).toBeNull();
    });

    it('rejects a value outside the union with check_violation', async () => {
      // 'urgent', not something like 'catastrophic': the column is VARCHAR(10),
      // so anything longer is refused with 22001 (string_data_right_truncation)
      // before the CHECK is ever evaluated. Both reject the row, but only this
      // one proves the CHECK is doing it.
      await expect(insertSummarisedLead('urgent')).rejects.toMatchObject({
        parent: {
          code: CHECK_VIOLATION,
          constraint: 'leads_summary_urgency_check',
        },
      });
    });
  });

  /**
   * Not a value set — a shape. `LeadSummary` has no optional fields, so a row
   * with three of the five columns populated is a row the wire contract cannot
   * express. The constraint is what lets lead-wire.ts read one column and infer
   * the other four instead of carrying five separate maybes.
   */
  describe('leads_summary_complete_check', () => {
    it('rejects a half-written summary', async () => {
      const id = await insertLead('active');

      await expect(setSummaryNarrativeOnly(id)).rejects.toMatchObject({
        parent: {
          code: CHECK_VIOLATION,
          constraint: 'leads_summary_complete_check',
        },
      });
    });

    it('accepts all five together', async () => {
      const id = await insertSummarisedLead('medium');

      expect(await storedLeadColumn(id, 'summary_urgency')).toBe('medium');
    });

    it('accepts none of the five, which is every lead before its first summary', async () => {
      const id = await insertLead('active');

      expect(await storedLeadColumn(id, 'summary_narrative')).toBeNull();
    });
  });

  /**
   * Also not a value set. The activity score's closed set is a RANGE, and it
   * has the same seam a hardcoded union has: `scoreLead` guarantees 0-100 by
   * construction in TypeScript, and nothing links that guarantee to this SQL.
   * Reweight the components so they sum to 110 and the only thing that notices
   * is a 23514 on the next write — which is exactly why the constraint is here
   * and why it is tested here.
   */
  describe('leads_activity_score_range_check', () => {
    it.each([0, 1, 50, 99, 100])(
      'accepts the in-range score %i',
      async (score) => {
        const id = await insertScoredLead(score);

        expect(await storedActivityScore(id)).toBe(score);
      },
    );

    it.each([101, -1, 1000])(
      'rejects the out-of-range score %i with check_violation',
      async (score) => {
        await expect(insertScoredLead(score)).rejects.toMatchObject({
          parent: {
            code: CHECK_VIOLATION,
            constraint: 'leads_activity_score_range_check',
          },
        });
      },
    );

    it('stores NULL, because a lead that has never been scored is normal', async () => {
      const id = await insertLead('active');

      expect(await storedActivityScore(id)).toBeNull();
    });
  });

  /**
   * A shape, like leads_summary_complete_check. Null means never scored, and
   * that fact is carried by BOTH columns or neither — a score with no
   * timestamp is a state the wire contract has no rendering for, and it is
   * what lets lead-wire.ts map the timestamp without re-testing the score.
   */
  describe('leads_activity_score_complete_check', () => {
    it('rejects a score written without its timestamp', async () => {
      const id = await insertLead('active');

      await expect(setActivityScoreOnly(id)).rejects.toMatchObject({
        parent: {
          code: CHECK_VIOLATION,
          constraint: 'leads_activity_score_complete_check',
        },
      });
    });

    it('rejects a timestamp written without its score', async () => {
      const id = await insertLead('active');

      await expect(setScoreCalculatedAtOnly(id)).rejects.toMatchObject({
        parent: {
          code: CHECK_VIOLATION,
          constraint: 'leads_activity_score_complete_check',
        },
      });
    });

    it('accepts both together', async () => {
      const id = await insertScoredLead(73);

      expect(await storedActivityScore(id)).toBe(73);
    });

    it('accepts neither, which is every lead before its first scoring', async () => {
      const id = await insertLead('active');

      expect(await storedActivityScore(id)).toBeNull();
    });
  });

  describe('interactions_type_check', () => {
    it.each([...INTERACTION_TYPES])(
      'accepts the InteractionType member %s',
      async (type) => {
        const leadId = await insertLead('active');
        const id = await insertInteraction(leadId, type);

        expect(await storedInteractionType(id)).toBe(type);
      },
    );

    it('rejects a value outside the union with check_violation', async () => {
      const leadId = await insertLead('active');

      await expect(
        insertInteraction(leadId, 'carrier-pigeon'),
      ).rejects.toMatchObject({
        parent: {
          code: CHECK_VIOLATION,
          constraint: 'interactions_type_check',
        },
      });
    });
  });
});

const CHECK_VIOLATION = '23514';

async function insertLead(
  status: string,
  propertyType: string | null = null,
): Promise<string> {
  const rows = await testConnection().query<{ id: string }>(
    `INSERT INTO leads (first_name, last_name, email, status, property_type)
         VALUES ('Constraint', 'Probe', 'probe@example.com', :status, :propertyType)
         RETURNING id`,
    { replacements: { status, propertyType }, type: QueryTypes.SELECT },
  );

  return rows[0].id;
}

/** A lead inserted with all five summary columns populated in the same statement. */
async function insertSummarisedLead(urgency: string): Promise<string> {
  const rows = await testConnection().query<{ id: string }>(
    `INSERT INTO leads (first_name, last_name, email, status,
                        summary_narrative, summary_next_action, summary_urgency,
                        summary_generated_at, summary_model)
         VALUES ('Constraint', 'Probe', 'probe@example.com', 'active',
                 'A narrative.', 'A next action.', :urgency,
                 now(), 'claude-opus-5')
         RETURNING id`,
    { replacements: { urgency }, type: QueryTypes.SELECT },
  );

  return rows[0].id;
}

/** One of the five, on its own — the partial write leads_summary_complete_check exists to refuse. */
function setSummaryNarrativeOnly(id: string): Promise<unknown> {
  return testConnection().query(
    `UPDATE leads SET summary_narrative = 'A narrative with nothing to go with it.'
         WHERE id = :id`,
    { replacements: { id }, type: QueryTypes.UPDATE },
  );
}

/** A lead inserted with both score columns populated in the same statement. */
async function insertScoredLead(score: number): Promise<string> {
  const rows = await testConnection().query<{ id: string }>(
    `INSERT INTO leads (first_name, last_name, email, status,
                        activity_score, score_calculated_at)
         VALUES ('Constraint', 'Probe', 'probe@example.com', 'active',
                 :score, now())
         RETURNING id`,
    { replacements: { score }, type: QueryTypes.SELECT },
  );

  return rows[0].id;
}

/** Half the pair — the partial write leads_activity_score_complete_check exists to refuse. */
function setActivityScoreOnly(id: string): Promise<unknown> {
  return testConnection().query(
    `UPDATE leads SET activity_score = 42 WHERE id = :id`,
    { replacements: { id }, type: QueryTypes.UPDATE },
  );
}

/** The other half, because a constraint that only catches one direction is half a constraint. */
function setScoreCalculatedAtOnly(id: string): Promise<unknown> {
  return testConnection().query(
    `UPDATE leads SET score_calculated_at = now() WHERE id = :id`,
    { replacements: { id }, type: QueryTypes.UPDATE },
  );
}

async function insertInteraction(
  leadId: string,
  type: string,
): Promise<string> {
  const rows = await testConnection().query<{ id: string }>(
    `INSERT INTO interactions (lead_id, type)
         VALUES (:leadId, :type)
         RETURNING id`,
    { replacements: { leadId, type }, type: QueryTypes.SELECT },
  );

  return rows[0].id;
}

async function storedLeadColumn(
  id: string,
  column: 'status' | 'property_type' | 'summary_urgency' | 'summary_narrative',
): Promise<string | null> {
  // Interpolated, not a replacement: Postgres does not accept a bind parameter
  // in place of an identifier. The union type is what keeps it safe.
  const rows = await testConnection().query<Record<string, string | null>>(
    `SELECT ${column} FROM leads WHERE id = :id`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  return rows[0][column];
}

async function storedInteractionType(id: string): Promise<string | null> {
  const rows = await testConnection().query<{ type: string | null }>(
    `SELECT type FROM interactions WHERE id = :id`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  return rows[0].type;
}

/** INTEGER, so the pg driver hands back a number — the assertion would be `'73'` otherwise. */
async function storedActivityScore(id: string): Promise<number | null> {
  const rows = await testConnection().query<{ activity_score: number | null }>(
    `SELECT activity_score FROM leads WHERE id = :id`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  return rows[0].activity_score;
}
