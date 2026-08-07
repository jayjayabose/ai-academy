import { setupTestDatabase, teardownTestDatabase, testConnection, truncateAll } from '@test/helpers';
import { QueryTypes } from 'sequelize';
import { INTERACTION_TYPES } from '../interactions/interaction-type';
import { LEAD_STATUSES, PROPERTY_TYPES } from '../leads/lead-status';

/**
 * The only thing linking the TypeScript unions to migration 001's SQL.
 *
 * Migration 001 hardcodes its value sets instead of importing LEAD_STATUSES and
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
 * Every insert is RAW SQL on purpose. Lead.create() would be stopped by the
 * model's own `validate.isIn` before Postgres ever saw the row, which would
 * make this a test of sequelize-typescript instead of a test of the schema.
 */

const CHECK_VIOLATION = '23514';

async function insertLead(status: string, propertyType: string | null = null): Promise<string> {
    const rows = await testConnection().query<{ id: string }>(
        `INSERT INTO leads (first_name, last_name, email, status, property_type)
         VALUES ('Constraint', 'Probe', 'probe@example.com', :status, :propertyType)
         RETURNING id`,
        { replacements: { status, propertyType }, type: QueryTypes.SELECT },
    );

    return rows[0].id;
}

async function insertInteraction(leadId: string, type: string): Promise<string> {
    const rows = await testConnection().query<{ id: string }>(
        `INSERT INTO interactions (lead_id, type)
         VALUES (:leadId, :type)
         RETURNING id`,
        { replacements: { leadId, type }, type: QueryTypes.SELECT },
    );

    return rows[0].id;
}

describe('migration 001 value-set constraints (integration)', () => {
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
        it.each([...LEAD_STATUSES])('accepts the LeadStatus member %s', async (status) => {
            const id = await insertLead(status);

            const [row] = await testConnection().query<{ status: string }>(
                `SELECT status FROM leads WHERE id = :id`,
                { replacements: { id }, type: QueryTypes.SELECT },
            );

            expect(row.status).toBe(status);
        });

        it('rejects a value outside the union with check_violation', async () => {
            await expect(insertLead('not-a-status')).rejects.toMatchObject({
                parent: { code: CHECK_VIOLATION, constraint: 'leads_status_check' },
            });
        });
    });

    describe('leads_property_type_check', () => {
        it.each([...PROPERTY_TYPES])('accepts the PropertyType member %s', async (propertyType) => {
            const id = await insertLead('active', propertyType);

            const [row] = await testConnection().query<{ property_type: string }>(
                `SELECT property_type FROM leads WHERE id = :id`,
                { replacements: { id }, type: QueryTypes.SELECT },
            );

            expect(row.property_type).toBe(propertyType);
        });

        it('accepts NULL, because property_type is optional', async () => {
            // A CHECK passes unless its expression is FALSE, and `NULL IN (...)`
            // is NULL, not FALSE. Migration 001 relies on this rather than on a
            // separate `OR property_type IS NULL` clause — worth pinning down, since
            // it is the behaviour that makes the nullable column workable at all.
            await expect(insertLead('active', null)).resolves.toEqual(expect.any(String));
        });

        it('rejects a value outside the union with check_violation', async () => {
            await expect(insertLead('active', 'houseboat')).rejects.toMatchObject({
                parent: { code: CHECK_VIOLATION, constraint: 'leads_property_type_check' },
            });
        });
    });

    describe('interactions_type_check', () => {
        it.each([...INTERACTION_TYPES])('accepts the InteractionType member %s', async (type) => {
            const leadId = await insertLead('active');
            const id = await insertInteraction(leadId, type);

            const [row] = await testConnection().query<{ type: string }>(
                `SELECT type FROM interactions WHERE id = :id`,
                { replacements: { id }, type: QueryTypes.SELECT },
            );

            expect(row.type).toBe(type);
        });

        it('rejects a value outside the union with check_violation', async () => {
            const leadId = await insertLead('active');

            await expect(insertInteraction(leadId, 'carrier-pigeon')).rejects.toMatchObject({
                parent: { code: CHECK_VIOLATION, constraint: 'interactions_type_check' },
            });
        });
    });
});
