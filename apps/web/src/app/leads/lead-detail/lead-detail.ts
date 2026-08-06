import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type {
  CreateInteractionRequest,
  Interaction,
  InteractionType,
  LeadDetail as LeadDetailResponse,
  LeadStatus,
  PropertyType,
} from '@ai-academy/shared';

import { apiErrorMessages, isNotFound } from '../../core/api-error';
import { isoToLocalInput, localInputToIso } from '../../core/format';
import {
  BudgetPipe,
  CountPipe,
  DateOnlyPipe,
  OrDashPipe,
  TimestampPipe,
} from '../../core/format.pipes';
import { controlError } from '../../core/form-validation';
import {
  INTERACTION_TYPES,
  INTERACTION_TYPE_LABELS,
  LEAD_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from '../../core/lead-status';
import { LeadService } from '../../core/lead.service';

/**
 * Named `LeadDetailPage` rather than `LeadDetail` because the wire type it
 * renders is already called `LeadDetail`; shadowing it inside this file would be
 * the sort of thing that reads fine and then costs someone twenty minutes.
 */
@Component({
  selector: 'app-lead-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    BudgetPipe,
    CountPipe,
    DateOnlyPipe,
    OrDashPipe,
    TimestampPipe,
  ],
  templateUrl: './lead-detail.html',
  styleUrl: './lead-detail.scss',
})
export class LeadDetailPage {
  private readonly leadService = inject(LeadService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly lead = signal<LeadDetailResponse | null>(null);
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly errors = signal<string[]>([]);

  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);

  protected readonly loggingInteraction = signal(false);
  protected readonly interactionErrors = signal<string[]>([]);

  protected readonly interactionTypes = INTERACTION_TYPES;

  /**
   * One request per screen: `GET /api/leads/:id` returns `LeadDetail` with the
   * interactions embedded, so history is never a second round trip.
   */
  protected readonly history = computed<Interaction[]>(() => {
    const interactions = this.lead()?.interactions ?? [];
    // Newest first. `occurredAt` is an ISO string; it is parsed here, at the
    // comparison edge, and the Date never escapes this callback.
    return [...interactions].sort(
      (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
    );
  });

  protected readonly interactionForm = new FormGroup({
    type: new FormControl<InteractionType>('call', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    /** Local 'YYYY-MM-DDTHH:mm' from the input; converted to ISO on submit. */
    occurredAt: new FormControl<string>(isoToLocalInput(null), { nonNullable: true }),
    notes: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.missing.set(false);
    this.errors.set([]);
    this.leadService.get(id).subscribe({
      next: (lead) => {
        this.lead.set(lead);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.missing.set(isNotFound(error));
        this.errors.set(apiErrorMessages(error));
        this.loading.set(false);
      },
    });
  }

  // --- Delete ---------------------------------------------------------------

  protected askToDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  /** Only ever reached from the confirmation panel. */
  protected confirmDelete(): void {
    const lead = this.lead();
    if (!lead || this.deleting()) return;
    this.deleting.set(true);
    this.errors.set([]);
    this.leadService.delete(lead.id).subscribe({
      next: () => {
        this.deleting.set(false);
        void this.router.navigate(['/leads']);
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.errors.set(apiErrorMessages(error));
      },
    });
  }

  // --- Log interaction ------------------------------------------------------

  protected logInteraction(): void {
    const lead = this.lead();
    if (!lead || this.loggingInteraction()) return;

    this.interactionForm.markAllAsTouched();
    if (this.interactionForm.invalid) return;

    const { type, occurredAt, notes } = this.interactionForm.getRawValue();
    const trimmedNotes = notes.trim();

    // Built field by field from `CreateInteractionRequest`. No spreading.
    const body: CreateInteractionRequest = {
      type,
      notes: trimmedNotes === '' ? null : trimmedNotes,
    };
    const iso = localInputToIso(occurredAt);
    // Omitted rather than guessed when blank, so the DB default (now()) applies.
    if (iso) body.occurredAt = iso;

    this.loggingInteraction.set(true);
    this.interactionErrors.set([]);
    this.leadService.logInteraction(lead.id, body).subscribe({
      next: (created) => {
        // The 201 body is the created row; splice it in rather than refetch.
        this.lead.update((current) =>
          current ? { ...current, interactions: [...current.interactions, created] } : current,
        );
        this.interactionForm.reset({
          type: 'call',
          occurredAt: isoToLocalInput(null),
          notes: '',
        });
        this.loggingInteraction.set(false);
      },
      error: (error: unknown) => {
        this.interactionErrors.set(apiErrorMessages(error));
        this.loggingInteraction.set(false);
      },
    });
  }

  protected interactionError(name: 'type' | 'occurredAt' | 'notes', label: string): string | null {
    return controlError(this.interactionForm.get(name), label);
  }

  // --- Labels ---------------------------------------------------------------

  protected statusLabel(status: LeadStatus): string {
    return LEAD_STATUS_LABELS[status];
  }

  protected propertyTypeLabel(propertyType: PropertyType | null): string | null {
    return propertyType === null ? null : PROPERTY_TYPE_LABELS[propertyType];
  }

  protected interactionTypeLabel(type: InteractionType): string {
    return INTERACTION_TYPE_LABELS[type];
  }
}
