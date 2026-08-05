import type { LeadStatus, PropertyType } from '@ai-academy/shared';

/**
 * Runtime mirrors of the shared union types — the frontend copy.
 *
 * This duplicates apps/api/src/leads/lead-status.ts on purpose. apps/web cannot
 * import from apps/api (peer workspaces; doing so would pull the Nest dependency
 * graph into the Angular build), and packages/shared is types-only by Decision 6,
 * so it cannot ship the arrays that dropdowns and validators need.
 *
 * Two copies, each independently compile-checked against the same shared union.
 * That duplication is the concrete price of the types-only rule — accepted
 * knowingly, because the alternative reintroduces a build step for the shared
 * package.
 *
 * `satisfies` alone is NOT sufficient: it only checks that every element IS a
 * member, so a subset passes silently. The `Exclude` assertion catches omissions
 * in the other direction. Both halves are required.
 */

type AssertEmpty<T extends never> = T;

export const LEAD_STATUSES = ['active', 'contacted', 'qualified', 'closed', 'lost'] as const satisfies readonly LeadStatus[];

export type _LeadStatusExhaustive = AssertEmpty<Exclude<LeadStatus, (typeof LEAD_STATUSES)[number]>>;

export const PROPERTY_TYPES = [
    'single-family',
    'condo',
    'townhouse',
    'multi-family',
    'land',
] as const satisfies readonly PropertyType[];

export type _PropertyTypeExhaustive = AssertEmpty<Exclude<PropertyType, (typeof PROPERTY_TYPES)[number]>>;

/** Human-readable labels for the list/detail views and form dropdowns. */
export const LEAD_STATUS_LABELS: Readonly<Record<LeadStatus, string>> = {
    active: 'Active',
    contacted: 'Contacted',
    qualified: 'Qualified',
    closed: 'Closed',
    lost: 'Lost',
};

export const PROPERTY_TYPE_LABELS: Readonly<Record<PropertyType, string>> = {
    'single-family': 'Single-family',
    condo: 'Condo',
    townhouse: 'Townhouse',
    'multi-family': 'Multi-family',
    land: 'Land',
};
