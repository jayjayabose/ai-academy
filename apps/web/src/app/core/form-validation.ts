import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Client-side mirrors of the validation-rules table in
 * `notes/day_01_contract.md` §3, plus the message rendering.
 *
 * The point is not to replace server validation — it runs regardless — but to
 * stop the user round-tripping to a 400 for something the browser already knows
 * is wrong. Where the wording differs from class-validator's, the server's
 * message still wins, because a 400 renders through `apiErrorMessages`.
 */

/** `firstName`/`lastName`: "trim, 1-100" — whitespace alone is not a name. */
export const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || value.trim().length === 0) return { required: true };
  return null;
};

/** `budget` and `bedrooms` are INTEGER columns. 4.5 bedrooms is a 400. */
export const integer: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === '' || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return { integer: true };
  return null;
};

/** `inquiryDate` is a 'YYYY-MM-DD' string, never an instant. */
export const dateOnly: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (typeof value !== 'string' || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { dateOnly: true };
  const [year, month, day] = value.split('-').map(Number);
  const probe = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  const roundTrips =
    probe.getFullYear() === year &&
    probe.getMonth() === (month ?? 1) - 1 &&
    probe.getDate() === day;
  return roundTrips ? null : { dateOnly: true };
};

/** The contract's ceilings, named so the numbers appear exactly once. */
export const BUDGET_MAX = 100_000_000;
export const BEDROOMS_MAX = 20;

/**
 * Renders a control's first error, but only once the user has had a chance to
 * get it right — an untouched pristine field is not "wrong" yet.
 */
export function controlError(control: AbstractControl | null, label: string): string | null {
  if (!control || !control.errors) return null;
  if (!control.touched && !control.dirty) return null;

  const errors = control.errors;
  if (errors['required']) return `${label} is required.`;
  if (errors['email']) return 'Enter a valid email address.';
  if (errors['maxlength']) {
    const required = Number(errors['maxlength'].requiredLength);
    return `${label} must be ${required} characters or fewer.`;
  }
  if (errors['integer']) return `${label} must be a whole number.`;
  if (errors['min']) return `${label} must be at least ${errors['min'].min}.`;
  if (errors['max']) return `${label} must be at most ${errors['max'].max}.`;
  if (errors['dateOnly']) return `${label} must be a real date in YYYY-MM-DD form.`;
  return `${label} is invalid.`;
}
