/**
 * The wire contract between apps/api and apps/web (Decision 6).
 *
 * Authored as `.d.ts` deliberately, for two reasons:
 *   1. A declaration file CANNOT contain runtime code, so Trap #7 ("packages/shared
 *      must stay types-only") is enforced by the file format rather than by
 *      discipline. No TS `enum`, no `as const`, no accidental build step.
 *   2. Declaration files emit nothing, so importing them from apps/api does not
 *      drag files outside the app's rootDir into the emit graph and reshape dist/.
 *
 * Consequence: closed value sets appear here only as union types. The runtime
 * arrays that `class-validator` and the Angular dropdowns need live in each app,
 * bound back to these unions by the `satisfies` + `Exclude` exhaustiveness bridge.
 *
 * Serialization rules (settled from success-criteria.md:574 and
 * validation-gates.md:75 — "PostgreSQL returns strings not Dates"):
 *   - timestamps  -> ISO 8601 strings, never Date
 *   - dates       -> 'YYYY-MM-DD' strings
 *   - ids         -> UUID strings
 *   - money       -> whole-dollar integers (INTEGER, so the pg driver returns a
 *                    real number; NUMERIC and BIGINT would arrive as strings)
 */

// ---------------------------------------------------------------------------
// Closed value sets
// ---------------------------------------------------------------------------

export type LeadStatus = 'active' | 'contacted' | 'qualified' | 'closed' | 'lost';

export type PropertyType = 'single-family' | 'condo' | 'townhouse' | 'multi-family' | 'land';

export type InteractionType = 'call' | 'email' | 'meeting' | 'note';

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    status: LeadStatus;
    /** Whole dollars. Null when the lead has not stated one. */
    budget: number | null;
    /** Nullable: often unknown at first contact. */
    location: string | null;
    /** Nullable: often unknown at first contact. */
    propertyType: PropertyType | null;
    /** Null for `land` — not applicable, as distinct from zero. */
    bedrooms: number | null;
    /** Deliberately unconstrained: no Day 1 consumer, likeliest value set to churn. */
    source: string | null;
    /** 'YYYY-MM-DD'. A date, not an instant — no time of day is known. */
    inquiryDate: string;
    notes: string | null;
    /** ISO 8601. */
    createdAt: string;
    /** ISO 8601. */
    updatedAt: string;
}

export interface Interaction {
    id: string;
    leadId: string;
    type: InteractionType;
    /** ISO 8601. A genuine instant, unlike Lead.inquiryDate. */
    occurredAt: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Returned by GET /api/leads/:id only. The list endpoint returns `Lead[]` with no
 * interactions — the two types exist so the compiler stops anyone assuming a list
 * row carries history.
 */
export interface LeadDetail extends Lead {
    interactions: Interaction[];
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/**
 * Required set is identity plus one reliable contact key. Everything else is
 * routinely unknown when a salesperson records a lead mid-phone-call, and a CRM
 * that refuses the record because the property type is unknown is broken.
 *
 * This mirrors the schema exactly: every optional field here is a nullable
 * column, and the three defaulted fields have DB-level DEFAULTs (so the CSV
 * importer, which bypasses DTOs entirely, gets them too).
 */
export interface CreateLeadRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    /** DB default: 'active'. */
    status?: LeadStatus;
    budget?: number | null;
    location?: string | null;
    propertyType?: PropertyType | null;
    bedrooms?: number | null;
    source?: string | null;
    /** 'YYYY-MM-DD'. DB default: CURRENT_DATE. */
    inquiryDate?: string;
    notes?: string | null;
}

/**
 * `{ budget: null }` clears the field; `{}` leaves it unchanged. That distinction
 * only survives if every optional property on the DTO carries `@IsOptional()`,
 * which permits null AND undefined. Without it, clearing a field silently
 * becomes impossible.
 */
export type UpdateLeadRequest = Partial<CreateLeadRequest>;

export interface CreateInteractionRequest {
    type: InteractionType;
    /** ISO 8601. DB default: now(). */
    occurredAt?: string;
    notes?: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * NestJS's default exception shape (Decision 11 — no custom envelope).
 * `message` is an array when ValidationPipe reports per-field failures.
 */
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error: string;
}
