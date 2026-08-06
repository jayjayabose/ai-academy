import { Pipe, PipeTransform } from '@angular/core';

import {
  formatBudget,
  formatCount,
  formatDateOnly,
  formatTimestamp,
  formatText,
} from './format';

/**
 * Thin pure pipes over `format.ts`. Pipes rather than component methods so the
 * formatting runs once per changed value instead of once per change-detection
 * pass, and so every table cell that can be null goes through a function that
 * knows about the em-dash.
 */

/** 'YYYY-MM-DD' -> 'Mar 4, 2026'. */
@Pipe({ name: 'dateOnly' })
export class DateOnlyPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDateOnly(value);
  }
}

/** ISO 8601 instant -> 'Mar 4, 2026, 2:15 PM'. */
@Pipe({ name: 'timestamp' })
export class TimestampPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatTimestamp(value);
  }
}

/** Whole dollars -> '$450,000'. */
@Pipe({ name: 'budget' })
export class BudgetPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatBudget(value);
  }
}

/** Integer or "not applicable". */
@Pipe({ name: 'count' })
export class CountPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatCount(value);
  }
}

/** Nullable string -> itself or an em-dash. */
@Pipe({ name: 'orDash' })
export class OrDashPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatText(value);
  }
}
