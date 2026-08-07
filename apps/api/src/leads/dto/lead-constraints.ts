import { Transform } from 'class-transformer';

/**
 * The validation limits from notes/day_01_contract.md:157-176, in one place so
 * CreateLeadDto and UpdateLeadDto cannot disagree about them.
 *
 * Deliberately NOT bridged to the frontend's copies at compile time, unlike the
 * union types. The asymmetry is principled (contract §3): union drift is silent
 * and semantic — a status the database rejects, a dropdown missing an option —
 * whereas a max-length disagreement surfaces as a 400 that names the field.
 * Only the first justifies machinery.
 */

export const NAME_MAX = 100;
export const EMAIL_MAX = 255;
export const PHONE_MAX = 30;
export const LOCATION_MAX = 100;
export const SOURCE_MAX = 30;
export const NOTES_MAX = 2000;

/** Well below INTEGER's 2.1B ceiling: this one is here to catch a typo'd extra zero. */
export const BUDGET_MAX = 100_000_000;
export const BEDROOMS_MAX = 20;

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Trims a string and leaves anything else alone, so @IsString still reports the real problem. */
export function Trim(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

/** Contract §3: email is normalised to lowercase on write. Runs before validation, so @IsEmail sees the normalised form. */
export function NormaliseEmail(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
