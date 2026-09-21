import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SAMPLE_LEADS, toListRow } from '../../testing/lead-samples';
import { LeadList } from './lead-list';

/**
 * Backed by HttpTestingController rather than the fixtureInterceptor these specs
 * used to run against. The interceptor was a hand-written reimplementation of the
 * API, so a passing test only ever proved the component agreed with a guess about
 * NestJS. Here the response is stated in the test, and the request the component
 * makes is asserted rather than assumed.
 */
/**
 * Column positions, named rather than spelled as magic numbers.
 *
 * The Score column landed second — it is the default sort key and the thing the
 * user scans — which shifted every index these specs used to hard-code. Naming
 * them means the next insertion is a one-line change here instead of a hunt
 * through the assertions.
 */
const COLUMN = {
  name: 0,
  score: 1,
  status: 2,
  budget: 3,
  location: 4,
  propertyType: 5,
  inquiryDate: 6,
} as const;

function rowCells(fixture: ComponentFixture<LeadList>, column: number): string[] {
  const rows = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
  return Array.from(rows).map((row) => {
    const cells = row.querySelectorAll('td');
    return (cells.item(column)?.textContent ?? '').trim();
  });
}

describe('LeadList', () => {
  let fixture: ComponentFixture<LeadList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(LeadList);
    fixture.detectChanges();

    // The list endpoint returns `Lead[]`, not `LeadDetail[]` — interactions are
    // the detail route's job, so the rows are stripped the way the API strips
    // them.
    http.expectOne('/api/leads').flush(SAMPLE_LEADS.map(toListRow));

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('renders one row per lead, sorted by activityScore descending by default', () => {
    // Contract amendment: the Day 1 default was inquiryDate descending. The
    // whole user story is "order the list by how hot each lead is", so a
    // default that needs a click is not the feature.
    const scores = rowCells(fixture, COLUMN.score);
    expect(scores.length).toBe(10);
    expect(scores[0]).toBe('78');
    // The unscored lead, not the two zeroes: null is unknown, and unknown sorts
    // below a lead we have actually measured as ice cold.
    expect(scores[scores.length - 1]).toBe('—');
    expect(scores[scores.length - 2]).toBe('0');
  });

  it('renders nullable columns as an em-dash, and never as "null" or blank', () => {
    const locations = rowCells(fixture, COLUMN.location);
    const budgets = rowCells(fixture, COLUMN.budget);
    expect(locations).toContain('—');
    expect(budgets).toContain('—');
    expect(locations.every((text) => text.length > 0 && text !== 'null')).toBe(true);
    expect(budgets.every((text) => text.length > 0 && text !== 'null')).toBe(true);
  });

  it('re-sorts client-side, keeping unknown values at the bottom in both directions', () => {
    const budgetHeader = fixture.nativeElement.querySelectorAll('thead .sort-button')[
      COLUMN.budget
    ] as HTMLButtonElement;

    budgetHeader.click();
    fixture.detectChanges();
    const ascending = rowCells(fixture, COLUMN.budget);
    expect(ascending[0]).toBe('$220,000');
    expect(ascending[ascending.length - 1]).toBe('—');

    budgetHeader.click();
    fixture.detectChanges();
    const descending = rowCells(fixture, COLUMN.budget);
    expect(descending[0]).toBe('$100,000,000');
    // Nulls stay last: reversing must not bury the rows that carry data.
    expect(descending[descending.length - 1]).toBe('—');
  });

  it('sorts without going back to the server', () => {
    // Contract §1: sorting is client-side because the list already carries every
    // field. A re-fetch per click would be an unnoticed regression — the rows
    // would still look right.
    (
      fixture.nativeElement.querySelectorAll('thead .sort-button')[
        COLUMN.budget
      ] as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    http.expectNone('/api/leads');
  });
});
