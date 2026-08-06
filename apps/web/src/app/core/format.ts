/**
 * Render-edge formatting.
 *
 * The wire contract carries dates and timestamps as STRINGS and nothing in this
 * app ever types them as `Date`. Parsing happens here, at the last possible
 * moment, and the parsed value never escapes the function.
 */

/** What a null column renders as. Never "null", never blank. */
export const EM_DASH = '—';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats a 'YYYY-MM-DD' domain date (`Lead.inquiryDate`).
 *
 * Deliberately does NOT use `new Date('2026-03-04')`: the JS spec parses a
 * date-only string as midnight **UTC**, which renders as the previous day
 * everywhere west of Greenwich. The parts are fed to the local-time Date
 * constructor instead.
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const match = ISO_DATE.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Formats an ISO 8601 instant (`createdAt`, `updatedAt`, `occurredAt`). */
export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Whole-dollar integer, or an em-dash when the lead has not stated a budget. */
export function formatBudget(value: number | null | undefined): string {
  if (value === null || value === undefined) return EM_DASH;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/**
 * Bedrooms is `null` for land — "not applicable", not zero. `0` is a real value
 * and must still render as "0".
 */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return EM_DASH;
  return String(value);
}

/** Any nullable string column. Empty strings count as absent. */
export function formatText(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === '') return EM_DASH;
  return value;
}

/** 'YYYY-MM-DD' for today, in local time — the default for a new inquiry date. */
export function todayAsDateOnly(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * `<input type="datetime-local">` produces 'YYYY-MM-DDTHH:mm' in local time and
 * has no timezone. The wire wants a real ISO 8601 instant, so the local value is
 * resolved against the browser's offset here — and immediately stringified.
 */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Inverse of {@link localInputToIso}, for seeding the form with "now". */
export function isoToLocalInput(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
