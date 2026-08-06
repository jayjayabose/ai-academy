import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type {
  CreateLeadRequest,
  Lead,
  LeadStatus,
  PropertyType,
  UpdateLeadRequest,
} from '@ai-academy/shared';

import { apiErrorMessages, isNotFound } from '../../core/api-error';
import {
  BEDROOMS_MAX,
  BUDGET_MAX,
  controlError,
  dateOnly,
  integer,
  trimmedRequired,
} from '../../core/form-validation';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from '../../core/lead-status';
import { todayAsDateOnly } from '../../core/format';
import { LeadService } from '../../core/lead.service';

/**
 * Typed reactive form.
 *
 * Text controls are `nonNullable`, so their value is always `string` and the
 * "empty means null on the wire" conversion happens in exactly one place
 * ({@link LeadForm.toPayload}). The two numeric controls are genuinely nullable:
 * `<input type="number">` yields `null` when cleared, and `null` is a real value
 * for both columns (`budget` = not stated, `bedrooms` = not applicable).
 *
 * Validators mirror the table in notes/day_01_contract.md §3, so a typo costs a
 * keystroke instead of a round trip to a 400.
 */
function createLeadForm() {
  return new FormGroup({
    firstName: new FormControl<string>('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.maxLength(100)],
    }),
    lastName: new FormControl<string>('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.maxLength(100)],
    }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.email, Validators.maxLength(255)],
    }),
    // No format regex, by contract: international numbers vary too much for one
    // to reject anything but valid numbers.
    phone: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    status: new FormControl<LeadStatus>('active', { nonNullable: true }),
    budget: new FormControl<number | null>(null, {
      validators: [integer, Validators.min(0), Validators.max(BUDGET_MAX)],
    }),
    location: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    /** `''` is the "unknown" option; it becomes `null` on the wire. */
    propertyType: new FormControl<PropertyType | ''>('', { nonNullable: true }),
    bedrooms: new FormControl<number | null>(null, {
      validators: [integer, Validators.min(0), Validators.max(BEDROOMS_MAX)],
    }),
    source: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    /**
     * 'YYYY-MM-DD' — `<input type="date">` produces exactly that string.
     *
     * Defaulted to the USER'S local today rather than left blank. Leaving it
     * blank falls through to the column's `DEFAULT CURRENT_DATE`, which is the
     * *database's* today — and the Postgres container runs UTC. A user at UTC-8
     * creating a lead at 17:00 local is already tomorrow in UTC, so the record
     * would be stamped a day ahead. That is the same off-by-one the
     * DATE-vs-TIMESTAMPTZ decision was made to avoid, relocated into the default.
     */
    inquiryDate: new FormControl<string>(todayAsDateOnly(), {
      nonNullable: true,
      validators: [dateOnly],
    }),
    notes: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
  });
}

type LeadFormField = keyof ReturnType<typeof createLeadForm>['controls'];

/**
 * Create and edit are the same form. The only differences are which request
 * type the payload is built as and which verb it is sent with, and both are
 * two lines — a second component would be two copies of twelve fields.
 */
@Component({
  selector: 'app-lead-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './lead-form.html',
  styleUrl: './lead-form.scss',
})
export class LeadForm {
  private readonly leadService = inject(LeadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Null on /leads/new, the lead id on /leads/:id/edit. */
  protected readonly leadId = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly missing = signal(false);
  protected readonly errors = signal<string[]>([]);

  protected readonly statuses = LEAD_STATUSES;
  protected readonly propertyTypes = PROPERTY_TYPES;
  protected readonly budgetMax = BUDGET_MAX;
  protected readonly bedroomsMax = BEDROOMS_MAX;

  protected readonly form = createLeadForm();

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      this.leadId.set(id);
      if (id) this.loadExisting(id);
    });

    // Deliberately NO client-side "land has no bedrooms" rule.
    //
    // An earlier version cleared and disabled `bedrooms` when propertyType was
    // 'land'. Removed: the API does not enforce it, so the form was stricter
    // than the contract — rejecting input the server accepts is a silent
    // asymmetry, and the worse of the two failure directions. The convention
    // holds in the seed data (land rows ship with bedrooms blank) but it is a
    // data-quality preference, not an invariant, and nothing downstream
    // computes on bedrooms for land.
    //
    // If this ever needs enforcing it belongs in BOTH places at once: a
    // cross-field DTO validator for a clean 400, and
    // CHECK (property_type IS DISTINCT FROM 'land' OR bedrooms IS NULL).
  }

  protected get editing(): boolean {
    return this.leadId() !== null;
  }

  private loadExisting(id: string): void {
    this.loading.set(true);
    this.missing.set(false);
    this.errors.set([]);
    this.leadService.get(id).subscribe({
      next: (lead) => {
        // Field by field, not a spread: the form has no home for id/createdAt/
        // updatedAt and setValue would reject them anyway.
        this.form.setValue({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone ?? '',
          status: lead.status,
          budget: lead.budget,
          location: lead.location ?? '',
          propertyType: lead.propertyType ?? '',
          bedrooms: lead.bedrooms,
          source: lead.source ?? '',
          inquiryDate: lead.inquiryDate,
          notes: lead.notes ?? '',
        });
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.missing.set(isNotFound(error));
        this.errors.set(apiErrorMessages(error));
        this.loading.set(false);
      },
    });
  }

  /**
   * Builds the request body one property at a time.
   *
   * This is the whole defence against the API's
   * `ValidationPipe({ forbidNonWhitelisted: true })`: spreading a fetched `Lead`
   * would carry `id`, `createdAt` and `updatedAt` into the payload and come back
   * as 400 "property id should not exist". The explicit annotation means the
   * compiler rejects a stray property here too.
   */
  private toPayload(): CreateLeadRequest {
    const value = this.form.getRawValue();
    const body: CreateLeadRequest = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      // Normalised to lowercase on write, matching the server.
      email: value.email.trim().toLowerCase(),
      phone: blankToNull(value.phone),
      status: value.status,
      budget: value.budget,
      location: blankToNull(value.location),
      propertyType: value.propertyType === '' ? null : value.propertyType,
      bedrooms: value.bedrooms,
      source: blankToNull(value.source),
      notes: blankToNull(value.notes),
    };
    // Omitted when blank so the DB default (CURRENT_DATE) applies. `null` would
    // be rejected: `inquiryDate` is `?: string`, not `?: string | null`.
    if (value.inquiryDate !== '') body.inquiryDate = value.inquiryDate;
    return body;
  }

  protected submit(): void {
    if (this.saving()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errors.set(['Fix the highlighted fields before saving.']);
      return;
    }

    this.errors.set([]);
    this.saving.set(true);

    const id = this.leadId();
    const request = id
      ? // `UpdateLeadRequest` is `Partial<CreateLeadRequest>`, so the same
        // field-by-field body is a valid PATCH.
        this.leadService.update(id, this.toPayload() satisfies UpdateLeadRequest)
      : this.leadService.create(this.toPayload());

    request.subscribe({
      next: (lead: Lead) => {
        this.saving.set(false);
        void this.router.navigate(['/leads', lead.id]);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errors.set(apiErrorMessages(error));
      },
    });
  }

  protected error(name: LeadFormField, label: string): string | null {
    return controlError(this.form.get(name), label);
  }

  protected statusLabel(status: LeadStatus): string {
    return LEAD_STATUS_LABELS[status];
  }

  protected propertyTypeLabel(propertyType: PropertyType): string {
    return PROPERTY_TYPE_LABELS[propertyType];
  }

  protected get cancelLink(): string[] {
    const id = this.leadId();
    return id ? ['/leads', id] : ['/leads'];
  }
}

/** An empty text input means "not stated", which is `null` on the wire. */
function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
