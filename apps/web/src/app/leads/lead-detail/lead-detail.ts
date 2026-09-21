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
  SummaryUrgency,
} from '@ai-academy/shared';

import type { ScoreBand } from '../../core/activity-score';
import { scoreAriaLabel, scoreBand } from '../../core/activity-score';
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
import { SUMMARY_URGENCY_LABELS } from '../../core/summary-urgency';

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

  /**
   * Deliberately separate from `loading`/`errors`: the summary is one slow call
   * (seconds, and the API tolerates minutes) hanging off a page that has already
   * rendered. Sharing the page's state would let a failed summary blank a lead.
   */
  protected readonly summarizing = signal(false);
  protected readonly summaryErrors = signal<string[]>([]);

  /**
   * Separate again, for the same reason and following the same shape as
   * `summarizing`/`summaryErrors`. Nothing on this page is gated on it.
   *
   * Note what this pair is NOT: there is no read-through generate-on-first-view
   * here. A score already exists on the server and the page displays what is
   * stored — that is the "persisted, not recomputed" requirement, and it is
   * pinned by a spec asserting the POST this page must never make on load.
   */
  protected readonly rescoring = signal(false);
  protected readonly scoreErrors = signal<string[]>([]);

  protected readonly interactionTypes = INTERACTION_TYPES;

  /**
   * One request per screen: `GET /api/leads/:id` returns `LeadDetail` with the
   * interactions embedded, so history is never a second round trip.
   */
  protected readonly history = computed<Interaction[]>(() => {
    const interactions = this.lead()?.interactions ?? [];
    // Newest first. `occurredAt` is an ISO string; it is parsed here, at the
    // comparison edge, and the Date never escapes this callback.
    return [...interactions].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
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
    // A summary error belongs to the lead that produced it, so it does not
    // survive into the next one. `summarizing` is not reset here: it tracks a
    // request that is genuinely still in flight.
    this.summaryErrors.set([]);
    this.scoreErrors.set([]);
    this.leadService.get(id).subscribe({
      next: (lead) => {
        this.lead.set(lead);
        this.loading.set(false);
        // Read-through cache: generate only when the server has nothing stored.
        // This is a side effect and fires exactly once per load, which is why it
        // lives here and not in the template or a computed — either of those
        // would re-run on change detection and bill for every render.
        if (lead.summary === null) this.generateSummary(lead.id);
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

  // --- AI summary -----------------------------------------------------------

  /**
   * Called on first view when the server has no summary, and by Regenerate.
   *
   * Nothing on this page is gated on `summarizing()` — the lead, the form and the
   * history all render from `lead()`, which is set before this request starts. A
   * summary that is slow, or that fails outright, costs the user the card and
   * nothing else.
   */
  private generateSummary(id: string): void {
    if (this.summarizing()) return;

    this.summarizing.set(true);
    this.summaryErrors.set([]);
    this.leadService.summarize(id).subscribe({
      next: (summary) => {
        // Splice the 200 body in rather than refetch, as logInteraction does with
        // its 201. The id check matters more here than there: this request can be
        // in flight for minutes, and the user may have navigated to another lead
        // in the meantime — without it, lead A's summary lands on lead B.
        this.lead.update((current) =>
          current && current.id === id ? { ...current, summary } : current,
        );
        this.summarizing.set(false);
      },
      error: (error: unknown) => {
        // 429/502/503 are one family per the API contract — the server's message
        // is already the right thing to show, so apiErrorMessages just unwraps
        // it. Any existing summary stays on screen; only the error line is added.
        if (this.lead()?.id === id) this.summaryErrors.set(apiErrorMessages(error));
        this.summarizing.set(false);
      },
    });
  }

  /** Regenerating is unconditional server-side; it replaces the stored summary. */
  protected regenerate(): void {
    const lead = this.lead();
    if (!lead) return;
    this.generateSummary(lead.id);
  }

  // --- Activity score -------------------------------------------------------

  /**
   * Recomputes and persists this one lead's score.
   *
   * Only ever called from the button. There is deliberately no counterpart to
   * the summary card's generate-on-first-view: a score is already stored, the
   * page renders what the server sent, and a POST on load would be the exact
   * "recomputed, not persisted" bug this feature is supposed to rule out.
   */
  protected rescore(): void {
    const lead = this.lead();
    if (!lead || this.rescoring()) return;

    const id = lead.id;
    this.rescoring.set(true);
    this.scoreErrors.set([]);
    this.leadService.rescore(id).subscribe({
      next: (scored) => {
        // The two fields, not a spread.
        //
        // The first version of this comment claimed `{ ...current, ...scored }`
        // would strip `interactions` and `summary` off the `LeadDetail`. That
        // is WRONG and was corrected by measuring it: the endpoint answers with
        // a `Lead`, which simply has no such keys, and spread does not
        // overwrite with keys that are absent. The card and the history survive
        // either way.
        //
        // The real difference is the other direction. A spread copies every
        // field the response DOES carry — `status`, `budget`, `updatedAt`, all
        // of it — so a button labelled "Recalculate score" would rewrite the
        // whole record from a payload nobody asked it for. Naming the two
        // fields says what a rescore actually changes, and keeps that true if
        // this route ever starts answering with something wider.
        //
        // The id guard is the same one `generateSummary` uses. This request is
        // milliseconds rather than minutes, so the window is narrow, but a
        // narrow window for landing one lead's score on another is still one.
        this.lead.update((current) =>
          current && current.id === id
            ? {
                ...current,
                activityScore: scored.activityScore,
                scoreCalculatedAt: scored.scoreCalculatedAt,
              }
            : current,
        );
        this.rescoring.set(false);
      },
      error: (error: unknown) => {
        // Only the score's own error line moves. The summary card, the details
        // and the history are untouched, and the badge keeps the stored score
        // it was already showing.
        if (this.lead()?.id === id) this.scoreErrors.set(apiErrorMessages(error));
        this.rescoring.set(false);
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

  protected urgencyLabel(urgency: SummaryUrgency): string {
    return SUMMARY_URGENCY_LABELS[urgency];
  }

  /** Badge modifier. Same pair as the list's, deriving from the same one file. */
  protected bandOf(score: number): ScoreBand {
    return scoreBand(score);
  }

  /** The badge's accessible name. Colour is reinforcement; this is the meaning. */
  protected scoreLabel(score: number): string {
    return scoreAriaLabel(score);
  }
}
