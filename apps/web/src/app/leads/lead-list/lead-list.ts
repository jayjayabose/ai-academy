import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { Lead, LeadStatus, PropertyType } from '@ai-academy/shared';

import type { ScoreBand } from '../../core/activity-score';
import { scoreAriaLabel, scoreBand } from '../../core/activity-score';
import { apiErrorMessages } from '../../core/api-error';
import { BudgetPipe, CountPipe, DateOnlyPipe, OrDashPipe } from '../../core/format.pipes';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from '../../core/lead-status';
import { LeadService } from '../../core/lead.service';

export type SortKey =
  | 'name'
  | 'activityScore'
  | 'status'
  | 'budget'
  | 'location'
  | 'propertyType'
  | 'inquiryDate';

type SortDirection = 'asc' | 'desc';

/** What a row is compared by. `null` always sorts last, in both directions. */
type SortValue = string | number | null;

@Component({
  selector: 'app-lead-list',
  imports: [RouterLink, BudgetPipe, CountPipe, DateOnlyPipe, OrDashPipe],
  templateUrl: './lead-list.html',
  styleUrl: './lead-list.scss',
})
export class LeadList {
  private readonly leadService = inject(LeadService);
  private readonly router = inject(Router);

  protected readonly leads = signal<Lead[]>([]);
  protected readonly loading = signal(true);
  protected readonly errors = signal<string[]>([]);

  /**
   * Deliberately separate from `loading`/`errors`, which own the page-level
   * fetch. Recalculating is a second request over a page that has already
   * rendered; sharing the page's state would let a failed recalculation empty
   * the table and take every score on screen with it. Same separation the
   * detail page makes for `summarizing`/`summaryErrors`.
   */
  protected readonly recalculating = signal(false);
  protected readonly recalculateErrors = signal<string[]>([]);

  /**
   * Contract: default sort is `activityScore` descending — hottest lead first,
   * with no click required.
   *
   * This AMENDS the Day 1 contract, which was `inquiryDate` descending. The
   * amendment is the feature: the user story is "I want the list ordered by how
   * hot each lead is so I work the top of it instead of guessing", and a default
   * the user has to click to get is not a default. Inquiry date is still one
   * click away on its own header.
   *
   * Leads with no score (`null`) pin to the bottom rather than reading as
   * ice-cold, which `sortedLeads` already handles for every nullable column.
   */
  protected readonly sortKey = signal<SortKey>('activityScore');
  protected readonly sortDirection = signal<SortDirection>('desc');

  protected readonly columns: readonly { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
    // Second, not last: it is the default sort key and the column the user
    // scans. A temperature gauge at the far right of a horizontally scrolling
    // table is a temperature gauge nobody reads.
    { key: 'activityScore', label: 'Score' },
    { key: 'status', label: 'Status' },
    { key: 'budget', label: 'Budget' },
    { key: 'location', label: 'Location' },
    { key: 'propertyType', label: 'Property type' },
    { key: 'inquiryDate', label: 'Inquiry date' },
  ];

  /**
   * Sorting is client-side by contract: the list endpoint returns every row, so
   * a re-sort is a comparison over an array already in memory — no request.
   */
  protected readonly sortedLeads = computed(() => {
    const key = this.sortKey();
    const factor = this.sortDirection() === 'asc' ? 1 : -1;
    return [...this.leads()].sort((a, b) => {
      const left = sortValue(a, key);
      const right = sortValue(b, key);
      // Nulls are "unknown", not "smallest". They are pinned to the bottom
      // BEFORE the direction factor is applied, so reversing the sort never
      // buries the rows that actually carry data.
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      return compare(left, right) * factor;
    });
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errors.set([]);
    this.leadService.list().subscribe({
      next: (leads) => {
        this.leads.set(leads);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errors.set(apiErrorMessages(error));
        this.loading.set(false);
      },
    });
  }

  /**
   * Recomputes every score in the book and replaces the rows with the response.
   *
   * Wholesale replacement is safe because the bulk endpoint returns the same
   * rows in the same order as `GET /api/leads` — no merge, no id matching. The
   * `sortedLeads` computed re-sorts off the new array by itself, so the table
   * re-orders without anything here touching the sort.
   *
   * The `recalculating()` guard is the double-submit guard: the button is
   * disabled while in flight, but a disabled button is a rendering detail and a
   * second click through a keyboard or a test would otherwise issue a second
   * POST.
   */
  protected recalculateScores(): void {
    if (this.recalculating()) return;
    this.recalculating.set(true);
    this.recalculateErrors.set([]);
    this.leadService.rescoreAll().subscribe({
      next: (leads) => {
        this.leads.set(leads);
        this.recalculating.set(false);
      },
      error: (error: unknown) => {
        // Only the error line changes. `leads()` is left exactly as it was, so
        // the scores already on screen — which are still the stored, correct
        // ones — survive a failed recalculation.
        this.recalculateErrors.set(apiErrorMessages(error));
        this.recalculating.set(false);
      },
    });
  }

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    // Dates read most usefully newest-first and scores hottest-first; everything
    // else A-Z / smallest-first.
    this.sortDirection.set(key === 'inquiryDate' || key === 'activityScore' ? 'desc' : 'asc');
  }

  protected ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected open(lead: Lead): void {
    void this.router.navigate(['/leads', lead.id]);
  }

  protected statusLabel(status: LeadStatus): string {
    return LEAD_STATUS_LABELS[status];
  }

  protected propertyTypeLabel(propertyType: PropertyType | null): string | null {
    // Returning null lets the `orDash` pipe own the em-dash, in one place.
    return propertyType === null ? null : PROPERTY_TYPE_LABELS[propertyType];
  }

  /**
   * Badge modifier for a scored lead.
   *
   * Only reachable from the branch of the template that has already proved the
   * score non-null — `scoreBand` takes a `number` and the compiler enforces it,
   * which is what keeps "never scored" out of the cold band.
   */
  protected bandOf(score: number): ScoreBand {
    return scoreBand(score);
  }

  /** The badge's accessible name. Colour is reinforcement; this is the meaning. */
  protected scoreLabel(score: number): string {
    return scoreAriaLabel(score);
  }
}

function sortValue(lead: Lead, key: SortKey): SortValue {
  switch (key) {
    case 'name':
      return `${lead.lastName} ${lead.firstName}`.toLowerCase();
    case 'activityScore':
      // Raw, including the nulls. No special-casing here: `sortedLeads` pins
      // null to the bottom before the direction factor is applied, so an
      // unscored lead stays out of the way in both directions. A second
      // null-check here would be a second place for the two to disagree — and
      // `0` is a real score that must sort among the numbers, not with them.
      return lead.activityScore;
    case 'status':
      // Pipeline order (active -> lost), not alphabetical: the array in
      // core/lead-status.ts is ordered, and "closed" before "contacted" would
      // be useless to a salesperson.
      return LEAD_STATUSES.indexOf(lead.status);
    case 'budget':
      return lead.budget;
    case 'location':
      return lead.location === null ? null : lead.location.toLowerCase();
    case 'propertyType':
      return lead.propertyType === null ? null : PROPERTY_TYPES.indexOf(lead.propertyType);
    case 'inquiryDate':
      // 'YYYY-MM-DD' is lexicographically ordered, so this needs no Date at all.
      return lead.inquiryDate;
  }
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
