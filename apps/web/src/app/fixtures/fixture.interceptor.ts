import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Observable, mergeMap, of, timer } from 'rxjs';

import type {
  ApiError,
  CreateInteractionRequest,
  CreateLeadRequest,
  Interaction,
  InteractionType,
  Lead,
  LeadDetail,
  LeadStatus,
  PropertyType,
  UpdateLeadRequest,
} from '@ai-academy/shared';

import { INTERACTION_TYPES, LEAD_STATUSES, PROPERTY_TYPES } from '../core/lead-status';
import { FIXTURE_LEADS, toListRow } from './leads.fixture';

/**
 * TEMPORARY. Serves `/api/**` from memory until apps/api lands.
 *
 * This is the entire fixture layer. `LeadService` is the real HttpClient client
 * and the components are final code; deleting one provider line in
 * `app.config.ts` (and then this directory) switches the app to the live API
 * with no other edit. See the header comment in `app.config.ts`.
 *
 * It deliberately imitates two server behaviours that the UI must survive:
 *   1. `ValidationPipe({ forbidNonWhitelisted: true })` — an unexpected property
 *      such as `id` on a PATCH body produces a 400 whose `message` is a
 *      `string[]`. That is the trap the field-by-field payload builders exist
 *      to avoid, and it is only a real check if the fixture enforces it.
 *   2. Database defaults — `status`, `inquiryDate` and `occurredAt` are filled
 *      in here when the request omits them, not in the DTO.
 */

const LATENCY_MS = 140;

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

let leads: LeadDetail[] = structuredClone(FIXTURE_LEADS);

/** Exposed for tests: restores the seed data. */
export function resetFixtureState(): void {
  leads = structuredClone(FIXTURE_LEADS);
}

function newId(): string {
  const maybeCrypto = globalThis.crypto as Crypto | undefined;
  if (maybeCrypto && typeof maybeCrypto.randomUUID === 'function') {
    return maybeCrypto.randomUUID();
  }
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

function respond<T>(status: number, body: T | null): Observable<HttpEvent<unknown>> {
  return timer(LATENCY_MS).pipe(
    mergeMap(() => of(new HttpResponse<unknown>({ status, body }))),
  );
}

function fail(url: string, status: number, message: string | string[], error: string) {
  const payload: ApiError = { statusCode: status, message, error };
  return timer(LATENCY_MS).pipe(
    mergeMap(() => {
      throw new HttpErrorResponse({ status, statusText: error, url, error: payload });
    }),
  );
}

const notFound = (url: string) => fail(url, 404, 'Lead not found', 'Not Found');
const badRequest = (url: string, messages: string[]) =>
  fail(url, 400, messages, 'Bad Request');

// ---------------------------------------------------------------------------
// Validation — a stand-in for class-validator, wording included
// ---------------------------------------------------------------------------

type AssertEmpty<T extends never> = T;

const CREATE_LEAD_KEYS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'status',
  'budget',
  'location',
  'propertyType',
  'bedrooms',
  'source',
  'inquiryDate',
  'notes',
] as const satisfies readonly (keyof CreateLeadRequest)[];

/** Same bridge as `core/lead-status.ts`: a missing key here would be silent. */
export type _CreateLeadKeysExhaustive = AssertEmpty<
  Exclude<keyof CreateLeadRequest, (typeof CREATE_LEAD_KEYS)[number]>
>;

const CREATE_INTERACTION_KEYS = [
  'type',
  'occurredAt',
  'notes',
] as const satisfies readonly (keyof CreateInteractionRequest)[];

export type _CreateInteractionKeysExhaustive = AssertEmpty<
  Exclude<keyof CreateInteractionRequest, (typeof CREATE_INTERACTION_KEYS)[number]>
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asRecord(body: unknown): Record<string, unknown> | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

function whitelist(body: Record<string, unknown>, allowed: readonly string[]): string[] {
  return Object.keys(body)
    .filter((key) => !allowed.includes(key))
    .map((key) => `property ${key} should not exist`);
}

function checkString(
  value: unknown,
  field: string,
  max: number,
  nullable: boolean,
): string[] {
  if (value === undefined) return [];
  if (value === null) return nullable ? [] : [`${field} should not be null or undefined`];
  if (typeof value !== 'string') return [`${field} must be a string`];
  if (value.trim().length === 0) return [`${field} should not be empty`];
  if (value.length > max) {
    return [`${field} must be shorter than or equal to ${max} characters`];
  }
  return [];
}

function checkInteger(
  value: unknown,
  field: string,
  min: number,
  max: number,
): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return [`${field} must be an integer number`];
  }
  if (value < min) return [`${field} must not be less than ${min}`];
  if (value > max) return [`${field} must not be greater than ${max}`];
  return [];
}

function checkIn(value: unknown, field: string, allowed: readonly string[]): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return [`${field} must be one of the following values: ${allowed.join(', ')}`];
  }
  return [];
}

/** Mirrors the validation-rules table in notes/day_01_contract.md. */
function validateLeadBody(body: Record<string, unknown>, partial: boolean): string[] {
  const messages = whitelist(body, CREATE_LEAD_KEYS);

  if (!partial) {
    for (const field of ['firstName', 'lastName', 'email'] as const) {
      if (body[field] === undefined) messages.push(`${field} should not be empty`);
    }
  }

  messages.push(...checkString(body['firstName'], 'firstName', 100, false));
  messages.push(...checkString(body['lastName'], 'lastName', 100, false));
  messages.push(...checkString(body['phone'], 'phone', 30, true));
  messages.push(...checkString(body['location'], 'location', 100, true));
  messages.push(...checkString(body['source'], 'source', 30, true));

  const email = body['email'];
  if (email !== undefined) {
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      messages.push('email must be an email');
    } else if (email.length > 255) {
      messages.push('email must be shorter than or equal to 255 characters');
    }
  }

  const notes = body['notes'];
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') messages.push('notes must be a string');
    else if (notes.length > 2000) {
      messages.push('notes must be shorter than or equal to 2000 characters');
    }
  }

  // `status` and `inquiryDate` are `?: T`, not `?: T | null` — omit them to get
  // the DB default; an explicit null is not a way to clear them.
  for (const field of ['status', 'inquiryDate'] as const) {
    if (body[field] === null) messages.push(`${field} should not be null`);
  }

  messages.push(...checkIn(body['status'], 'status', LEAD_STATUSES));
  messages.push(...checkIn(body['propertyType'], 'propertyType', PROPERTY_TYPES));
  messages.push(...checkInteger(body['budget'], 'budget', 0, 100_000_000));
  messages.push(...checkInteger(body['bedrooms'], 'bedrooms', 0, 20));

  const inquiryDate = body['inquiryDate'];
  if (inquiryDate !== undefined && inquiryDate !== null) {
    if (typeof inquiryDate !== 'string' || !DATE_RE.test(inquiryDate)) {
      messages.push('inquiryDate must be a valid ISO 8601 date string');
    }
  }

  return messages;
}

function validateInteractionBody(body: Record<string, unknown>): string[] {
  const messages = whitelist(body, CREATE_INTERACTION_KEYS);

  if (body['type'] === undefined) {
    messages.push('type should not be empty');
  } else {
    messages.push(...checkIn(body['type'], 'type', INTERACTION_TYPES));
  }

  const occurredAt = body['occurredAt'];
  if (occurredAt !== undefined && occurredAt !== null) {
    if (typeof occurredAt !== 'string' || Number.isNaN(new Date(occurredAt).getTime())) {
      messages.push('occurredAt must be a valid ISO 8601 date string');
    }
  }

  const notes = body['notes'];
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') messages.push('notes must be a string');
    else if (notes.length > 2000) {
      messages.push('notes must be shorter than or equal to 2000 characters');
    }
  }

  return messages;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function createLead(body: Record<string, unknown>): Lead {
  // Safe only because validateLeadBody() has already run over this body.
  const request = body as unknown as CreateLeadRequest;
  const timestamp = nowIso();
  const detail: LeadDetail = {
    id: newId(),
    firstName: request.firstName.trim(),
    lastName: request.lastName.trim(),
    email: request.email.trim().toLowerCase(),
    phone: request.phone ?? null,
    // DB default.
    status: request.status ?? 'active',
    budget: request.budget ?? null,
    location: request.location ?? null,
    propertyType: request.propertyType ?? null,
    bedrooms: request.bedrooms ?? null,
    source: request.source ?? null,
    // DB default: CURRENT_DATE.
    inquiryDate: request.inquiryDate ?? today(),
    notes: request.notes ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
    interactions: [],
  };
  leads = [...leads, detail];
  return toListRow(detail);
}

/**
 * PATCH semantics from the contract: a key present with `null` clears the field,
 * an absent key leaves it alone. `undefined` never reaches here — it does not
 * survive JSON.
 */
function patchLead(existing: LeadDetail, body: Record<string, unknown>): Lead {
  const request = body as UpdateLeadRequest;
  const has = (key: keyof UpdateLeadRequest) => Object.hasOwn(body, key);

  const updated: LeadDetail = {
    ...existing,
    firstName: has('firstName') ? (request.firstName as string).trim() : existing.firstName,
    lastName: has('lastName') ? (request.lastName as string).trim() : existing.lastName,
    email: has('email') ? (request.email as string).trim().toLowerCase() : existing.email,
    phone: has('phone') ? (request.phone ?? null) : existing.phone,
    status: has('status') ? (request.status as LeadStatus) : existing.status,
    budget: has('budget') ? (request.budget ?? null) : existing.budget,
    location: has('location') ? (request.location ?? null) : existing.location,
    propertyType: has('propertyType')
      ? ((request.propertyType ?? null) as PropertyType | null)
      : existing.propertyType,
    bedrooms: has('bedrooms') ? (request.bedrooms ?? null) : existing.bedrooms,
    source: has('source') ? (request.source ?? null) : existing.source,
    inquiryDate: has('inquiryDate')
      ? (request.inquiryDate as string)
      : existing.inquiryDate,
    notes: has('notes') ? (request.notes ?? null) : existing.notes,
    updatedAt: nowIso(),
  };

  leads = leads.map((lead) => (lead.id === existing.id ? updated : lead));
  return toListRow(updated);
}

function addInteraction(existing: LeadDetail, body: Record<string, unknown>): Interaction {
  // Safe only because validateInteractionBody() has already run over this body.
  const request = body as unknown as CreateInteractionRequest;
  const timestamp = nowIso();
  const interaction: Interaction = {
    id: newId(),
    leadId: existing.id,
    type: request.type as InteractionType,
    // DB default: now().
    occurredAt: request.occurredAt ?? timestamp,
    notes: request.notes ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  leads = leads.map((lead) =>
    lead.id === existing.id
      ? { ...lead, interactions: [...lead.interactions, interaction] }
      : lead,
  );
  return interaction;
}

// ---------------------------------------------------------------------------
// The interceptor
// ---------------------------------------------------------------------------

export const fixtureInterceptor: HttpInterceptorFn = (req, next) => {
  const path = req.url.split('?')[0] ?? '';
  const segments = path.split('/').filter((segment) => segment.length > 0);

  if (segments[0] !== 'api') return next(req);

  const url = req.url;
  const body = asRecord(req.body);

  // /api/leads
  if (segments.length === 2 && segments[1] === 'leads') {
    if (req.method === 'GET') return respond<Lead[]>(200, leads.map(toListRow));
    if (req.method === 'POST') {
      if (!body) return badRequest(url, ['request body must be an object']);
      const messages = validateLeadBody(body, false);
      if (messages.length > 0) return badRequest(url, messages);
      return respond<Lead>(201, createLead(body));
    }
    return fail(url, 405, `Cannot ${req.method} ${path}`, 'Method Not Allowed');
  }

  // /api/leads/:id
  if (segments.length === 3 && segments[1] === 'leads') {
    const id = decodeURIComponent(segments[2] ?? '');
    const existing = leads.find((lead) => lead.id === id);
    if (!existing) return notFound(url);

    if (req.method === 'GET') return respond<LeadDetail>(200, existing);
    if (req.method === 'PATCH') {
      if (!body) return badRequest(url, ['request body must be an object']);
      const messages = validateLeadBody(body, true);
      if (messages.length > 0) return badRequest(url, messages);
      return respond<Lead>(200, patchLead(existing, body));
    }
    if (req.method === 'DELETE') {
      // ON DELETE CASCADE: dropping the lead drops its interactions with it.
      leads = leads.filter((lead) => lead.id !== id);
      return respond<null>(204, null);
    }
    return fail(url, 405, `Cannot ${req.method} ${path}`, 'Method Not Allowed');
  }

  // /api/leads/:leadId/interactions
  if (segments.length === 4 && segments[1] === 'leads' && segments[3] === 'interactions') {
    const leadId = decodeURIComponent(segments[2] ?? '');
    const existing = leads.find((lead) => lead.id === leadId);
    if (!existing) return notFound(url);

    if (req.method === 'POST') {
      if (!body) return badRequest(url, ['request body must be an object']);
      const messages = validateInteractionBody(body);
      if (messages.length > 0) return badRequest(url, messages);
      return respond<Interaction>(201, addInteraction(existing, body));
    }
    return fail(url, 405, `Cannot ${req.method} ${path}`, 'Method Not Allowed');
  }

  return fail(url, 404, `Cannot ${req.method} ${path}`, 'Not Found');
};
