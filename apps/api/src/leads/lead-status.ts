import type { LeadStatus, PropertyType } from '@ai-academy/shared';

/**
 * Runtime mirrors of the shared union types.
 *
 * `packages/shared` is types-only (D6/Trap #7), but `class-validator`'s `@IsIn()`,
 * Sequelize's `validate.isIn`, and the Angular dropdowns all need real arrays.
 * These are those arrays, bound back to the unions so they cannot drift.
 *
 * `satisfies` alone is NOT sufficient — it only checks that each element IS a
 * member, so a *subset* passes silently. The `Exclude` assertion catches
 * omissions in the other direction. Both halves are required.
 *
 * apps/web needs its own copy: it cannot import from apps/api. That duplication
 * is the concrete price of keeping the shared package types-only.
 */

type AssertEmpty<T extends never> = T;

export const LEAD_STATUSES = ['active', 'contacted', 'qualified', 'closed', 'lost'] as const satisfies readonly LeadStatus[];

// Fails to compile if a LeadStatus member is missing from LEAD_STATUSES above.
export type _LeadStatusExhaustive = AssertEmpty<Exclude<LeadStatus, (typeof LEAD_STATUSES)[number]>>;

export const PROPERTY_TYPES = [
    'single-family',
    'condo',
    'townhouse',
    'multi-family',
    'land',
] as const satisfies readonly PropertyType[];

export type _PropertyTypeExhaustive = AssertEmpty<Exclude<PropertyType, (typeof PROPERTY_TYPES)[number]>>;
