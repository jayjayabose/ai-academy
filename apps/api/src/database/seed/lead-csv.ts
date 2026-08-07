import type { LeadStatus, PropertyType } from '@ai-academy/shared';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { workspaceRoot } from '../../config/workspace-env';
import { LEAD_STATUSES, PROPERTY_TYPES } from '../../leads/lead-status';

/**
 * Reads seed-leads.csv into typed rows.
 *
 * The parsing is separated from the file reading so it can be exercised without
 * touching the disk or the database. Everything a CSV can get wrong — an empty
 * cell that must become NULL rather than '', a number arriving as a string, a
 * status the schema will reject — is decided here, in the unit tier.
 *
 * The importer deliberately does NOT run rows through the DTOs (D13): a file
 * importer bypasses request validation by design, and the real guard is the
 * database constraints. But "no DTOs" is not "no checks" — a bad row should be
 * named at parse time, not surface 80 rows later as a 23514 from a bulk insert
 * that then rolls the whole thing back.
 */

export interface SeedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: LeadStatus;
  budget: number | null;
  location: string | null;
  propertyType: PropertyType | null;
  bedrooms: number | null;
  source: string | null;
  inquiryDate: string;
  notes: string | null;
}

/** The CSV lives at the repo root, not under data/ — .gitignore:55 ignores /data/*.csv, so a seed file there would never reach a fresh clone. */
export function defaultSeedCsvPath(): string {
  return join(workspaceRoot(), 'seed-leads.csv');
}

export function readSeedLeads(path: string = defaultSeedCsvPath()): SeedLead[] {
  return parseSeedLeads(readFileSync(path, 'utf8'), path);
}

export function parseSeedLeads(csv: string, source = '<input>'): SeedLead[] {
  // Annotated rather than asserted. `parse` returns `any` with `columns: true`,
  // and `as Record<string, string>[]` on an `any` reads as a no-op to
  // @typescript-eslint/no-unnecessary-type-assertion — `lint --fix` deletes it.
  // An annotation narrows the same way and survives the fixer.
  const records: Record<string, string>[] = parse(csv, {
    columns: true,
    skipEmptyLines: true,
    // Leading/trailing spaces around a cell are always accidental here, and an
    // untrimmed ' ' would be stored instead of NULL by the emptiness checks below.
    trim: true,
  });

  if (records.length === 0) {
    throw new Error(`${source} contains no data rows.`);
  }

  return records.map((record, index) =>
    toSeedLead(record, `${source}:${index + 2}`),
  );
}

/** `where` names the file and the 1-based line, counting the header — so it matches what an editor shows. */
function toSeedLead(record: Record<string, string>, where: string): SeedLead {
  return {
    firstName: required(record.firstName, 'firstName', where),
    lastName: required(record.lastName, 'lastName', where),
    email: required(record.email, 'email', where),
    phone: optional(record.phone),
    status: oneOf(
      required(record.status, 'status', where),
      LEAD_STATUSES,
      'status',
      where,
    ),
    budget: optionalInteger(record.budget, 'budget', where),
    location: optional(record.location),
    propertyType: optionalOneOf(
      record.propertyType,
      PROPERTY_TYPES,
      'propertyType',
      where,
    ),
    bedrooms: optionalInteger(record.bedrooms, 'bedrooms', where),
    source: optional(record.source),
    inquiryDate: isoDate(
      required(record.inquiryDate, 'inquiryDate', where),
      where,
    ),
    notes: optional(record.notes),
  };
}

function required(
  value: string | undefined,
  column: string,
  where: string,
): string {
  if (!value) {
    throw new Error(`${where}: ${column} is required but empty.`);
  }

  return value;
}

/**
 * The distinction the whole importer turns on: an absent cell is NULL, not ''.
 * Storing '' would make `phone IS NULL` false for a lead with no phone, and the
 * wire contract types these fields as `T | null`.
 */
function optional(value: string | undefined): string | null {
  return value ? value : null;
}

function optionalInteger(
  value: string | undefined,
  column: string,
  where: string,
): number | null {
  if (!value) return null;

  const parsed = Number(value);

  // Number('') is 0 and Number('12abc') is NaN; the empty case is already gone,
  // so this catches genuine garbage. Integer because both columns are INTEGER —
  // a fractional value would be silently rounded by the driver.
  if (!Number.isInteger(parsed)) {
    throw new Error(
      `${where}: ${column} must be a whole number, got "${value}".`,
    );
  }

  return parsed;
}

function oneOf<T extends string>(
  value: string,
  permitted: readonly T[],
  column: string,
  where: string,
): T {
  if (!(permitted as readonly string[]).includes(value)) {
    throw new Error(
      `${where}: ${column} "${value}" is not one of ${permitted.join(', ')}.`,
    );
  }

  return value as T;
}

function optionalOneOf<T extends string>(
  value: string | undefined,
  permitted: readonly T[],
  column: string,
  where: string,
): T | null {
  return value ? oneOf(value, permitted, column, where) : null;
}

/** DATEONLY column: the string is stored as written, so a malformed one becomes a Postgres error at insert time instead of here. */
function isoDate(value: string, where: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(
      `${where}: inquiryDate must be YYYY-MM-DD, got "${value}".`,
    );
  }

  return value;
}
