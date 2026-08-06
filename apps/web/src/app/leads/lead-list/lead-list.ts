import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { Lead, LeadStatus, PropertyType } from '@ai-academy/shared';

import { apiErrorMessages } from '../../core/api-error';
import { BudgetPipe, DateOnlyPipe, OrDashPipe } from '../../core/format.pipes';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from '../../core/lead-status';
import { LeadService } from '../../core/lead.service';

export type SortKey =
  | 'name'
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
  imports: [RouterLink, BudgetPipe, DateOnlyPipe, OrDashPipe],
  templateUrl: './lead-list.html',
  styleUrl: './lead-list.scss',
})
export class LeadList {
  private readonly leadService = inject(LeadService);
  private readonly router = inject(Router);

  protected readonly leads = signal<Lead[]>([]);
  protected readonly loading = signal(true);
  protected readonly errors = signal<string[]>([]);

  /** Contract: default sort is `inquiryDate` descending. */
  protected readonly sortKey = signal<SortKey>('inquiryDate');
  protected readonly sortDirection = signal<SortDirection>('desc');

  protected readonly columns: readonly { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' },
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

  protected sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(key);
    // Dates read most usefully newest-first; everything else A-Z / smallest-first.
    this.sortDirection.set(key === 'inquiryDate' ? 'desc' : 'asc');
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
}

function sortValue(lead: Lead, key: SortKey): SortValue {
  switch (key) {
    case 'name':
      return `${lead.lastName} ${lead.firstName}`.toLowerCase();
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
