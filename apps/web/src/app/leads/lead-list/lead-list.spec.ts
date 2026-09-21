import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ApiError } from '@ai-academy/shared';

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

  function texts(selector: string): string[] {
    const nodes = fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
    return Array.from(nodes).map((node) => (node.textContent ?? '').trim());
  }

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

  // --- Activity score -------------------------------------------------------

  describe('the activity score column', () => {
    function scoreBadges(): HTMLElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('tbody .score'));
    }

    it('renders the number and the band class, in all three colours', () => {
      const badges = scoreBadges();
      // Nine of the ten fixtures are scored; the tenth is null and gets no
      // badge at all.
      expect(badges.length).toBe(9);

      const byScore = new Map(badges.map((badge) => [badge.textContent!.trim(), badge]));
      // One from each band, including both sides of a cutoff.
      expect(byScore.get('78')!.classList.contains('score--hot')).toBe(true);
      expect(byScore.get('72')!.classList.contains('score--hot')).toBe(true);
      expect(byScore.get('31')!.classList.contains('score--warm')).toBe(true);
      expect(byScore.get('50')!.classList.contains('score--warm')).toBe(true);
      expect(byScore.get('15')!.classList.contains('score--cold')).toBe(true);

      // Accessibility: the number is visible, and the band the colour stands
      // for is spelled out for anyone who cannot see it.
      expect(byScore.get('78')!.getAttribute('aria-label')).toBe('Activity score 78, hot');
    });

    it('renders a clamped 0 as a red badge, not as a missing score', () => {
      // The single most likely way to get this wrong: `@if (lead.activityScore)`
      // instead of `!== null`. With truthiness the two terminal leads here —
      // and 23 of the 100 in the live data — turn into em-dashes and drop out
      // of the table's bottom.
      const zero = scoreBadges().find((badge) => badge.textContent!.trim() === '0');
      expect(zero).toBeTruthy();
      expect(zero!.classList.contains('score--cold')).toBe(true);
      expect(zero!.getAttribute('aria-label')).toBe('Activity score 0, cold');
    });

    it('renders a never-scored lead as an em-dash with no badge', () => {
      const scores = rowCells(fixture, COLUMN.score);
      expect(scores.filter((text) => text === '—').length).toBe(1);
      expect(scores).not.toContain('null');
    });

    it('keeps the unscored lead last whichever way the score column is sorted', () => {
      const scoreHeader = fixture.nativeElement.querySelectorAll('thead .sort-button')[
        COLUMN.score
      ] as HTMLButtonElement;

      // Already descending on load; one click flips it to ascending.
      scoreHeader.click();
      fixture.detectChanges();
      const ascending = rowCells(fixture, COLUMN.score);
      expect(ascending[0]).toBe('0');
      expect(ascending[ascending.length - 1]).toBe('—');

      scoreHeader.click();
      fixture.detectChanges();
      const descending = rowCells(fixture, COLUMN.score);
      expect(descending[0]).toBe('78');
      // Unknown is not "smallest". Reversing must not bury it among the zeroes,
      // and must not float it above the hottest lead either.
      expect(descending[descending.length - 1]).toBe('—');
    });

    it('marks the Score header as the sorted column without a click', () => {
      const headers = fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>;
      expect(headers.item(COLUMN.score).getAttribute('aria-sort')).toBe('descending');
      expect(headers.item(COLUMN.inquiryDate).getAttribute('aria-sort')).toBe('none');
    });
  });

  describe('recalculating every score', () => {
    function recalculateButton(): HTMLButtonElement {
      return fixture.nativeElement.querySelector('.page-head .button') as HTMLButtonElement;
    }

    it('issues exactly one POST and re-sorts from the response', () => {
      const button = recalculateButton();
      expect(button.textContent!.trim()).toBe('Recalculate scores');

      button.click();
      // Twice: the button is disabled while in flight, but a disabled button is
      // a rendering detail. The guard in the handler is what makes this one
      // request, and only asserting a single click would not prove it.
      button.click();
      fixture.detectChanges();

      const posted = http.match({ method: 'POST', url: '/api/leads/scores/recalculate' });
      expect(posted.length).toBe(1);
      expect(posted[0]!.request.body).toEqual({});
      expect(recalculateButton().disabled).toBe(true);
      expect(recalculateButton().textContent!.trim()).toBe('Recalculating…');

      // The bulk route answers with the whole book in the SERVER's order
      // (inquiryDate desc), not score order — re-sorting is the client's job,
      // and flushing them in server order is what proves it does it.
      const rescored = SAMPLE_LEADS.map(toListRow).map((lead) => ({
        ...lead,
        activityScore: lead.activityScore === null ? null : Math.min(100, lead.activityScore + 9),
      }));
      posted[0]!.flush(rescored);
      fixture.detectChanges();

      const scores = rowCells(fixture, COLUMN.score);
      expect(scores[0]).toBe('87');
      expect(scores[scores.length - 1]).toBe('—');
      expect(recalculateButton().disabled).toBe(false);
      expect(recalculateButton().textContent!.trim()).toBe('Recalculate scores');
    });

    it('leaves every existing score on screen when the recalculation fails', () => {
      const before = rowCells(fixture, COLUMN.score);

      recalculateButton().click();
      fixture.detectChanges();

      const body: ApiError = {
        statusCode: 503,
        message: 'Service Unavailable',
        error: 'Service Unavailable',
      };
      http
        .expectOne({ method: 'POST', url: '/api/leads/scores/recalculate' })
        .flush(body, { status: 503, statusText: 'Service Unavailable' });
      fixture.detectChanges();

      // The table is the whole point. A failed recalculation that empties it
      // loses the user every score they already had — all of which are still
      // the correct stored values.
      expect(rowCells(fixture, COLUMN.score)).toEqual(before);
      expect(texts('.errors--recalculate li').length).toBe(1);
      // Its own line, not the page-level one, which owns the fetch.
      expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
      expect(recalculateButton().disabled).toBe(false);
    });

    it('does not fire a recalculation on load', () => {
      // The mirror of the detail page's "the call it must not make". The scores
      // in the table are persisted; rendering them costs one GET and nothing
      // else.
      fixture.detectChanges();
      fixture.detectChanges();
      http.expectNone({ method: 'POST', url: '/api/leads/scores/recalculate' });
    });
  });
});
