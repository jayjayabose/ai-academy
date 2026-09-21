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

/** How soon the salesperson should act, as judged by the model. See LeadSummary. */
export type SummaryUrgency = 'low' | 'medium' | 'high';

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
    /**
     * How hot this lead is, 0-100, from recency, engagement, budget and status.
     *
     * Null means NEVER SCORED, which is a different fact from 0 (ice cold) — a
     * lead created through POST /api/leads has no interactions and no score
     * until someone recalculates. The list renders null as an em-dash and sorts
     * it last; it does not render it as a zero.
     *
     * INTEGER in the database, so the pg driver returns a real number. NUMERIC
     * would arrive as the string "87" and every comparison in the sort would be
     * lexicographic.
     *
     * On `Lead` rather than `LeadDetail` — unlike `summary` — because the list
     * sorts by it, so every row must carry it.
     */
    activityScore: number | null;
    /**
     * ISO 8601. When the server computed `activityScore`.
     *
     * Provenance, exactly as `LeadSummary.generatedAt` is: scores are not
     * invalidated when a lead or its interactions change, so a score computed
     * before this morning's three calls is stale and the user is entitled to
     * see that. Null whenever `activityScore` is null, and never otherwise —
     * `leads_activity_score_complete_check` makes the half-populated pair
     * unrepresentable.
     */
    scoreCalculatedAt: string | null;
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
 * An AI-authored read of one lead, generated on demand and then persisted.
 *
 * The first three fields are the model's; the last two are provenance the server
 * stamps, so a stale summary can be recognised as stale.
 */
export interface LeadSummary {
    /** 2–3 sentences: who this lead is and where things stand. */
    narrative: string;
    /** One concrete next step for the salesperson. */
    nextAction: string;
    urgency: SummaryUrgency;
    /** ISO 8601. When the model produced this. */
    generatedAt: string;
    /** The model that produced it, e.g. 'claude-opus-5'. */
    model: string;
}

/**
 * Returned by GET /api/leads/:id only. The list endpoint returns `Lead[]` with no
 * interactions — the two types exist so the compiler stops anyone assuming a list
 * row carries history.
 */
export interface LeadDetail extends Lead {
    interactions: Interaction[];
    /**
     * Null until first generated. POST /api/leads/:id/summary fills it.
     * Deliberately on LeadDetail only — list rows never carry a summary.
     */
    summary: LeadSummary | null;
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
