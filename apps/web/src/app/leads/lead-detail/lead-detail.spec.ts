import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { ParamMap } from '@angular/router';
import type { ApiError, Interaction, LeadDetail, SummaryUrgency } from '@ai-academy/shared';
import { BehaviorSubject, of } from 'rxjs';

import { SUMMARY_URGENCIES } from '../../core/summary-urgency';
import { SAMPLE_LEADS, sampleSummary, toListRow } from '../../testing/lead-samples';
import { LeadDetailPage } from './lead-detail';

/**
 * The badge copy, spelled out rather than imported from SUMMARY_URGENCY_LABELS.
 *
 * Importing the map would make these assertions circular — a typo in the map
 * would change both the render and the expectation, and the test would still
 * pass. (It did: caught by mutating 'Low urgency' to 'Medium urgency' and
 * watching the suite stay green.) Typing it as a full Record keeps the
 * exhaustiveness the map has, so a new urgency is a compile error here too.
 */
const EXPECTED_URGENCY_LABELS: Readonly<Record<SummaryUrgency, string>> = {
  low: 'Low urgency',
  medium: 'Medium urgency',
  high: 'High urgency',
};

/** The five-interaction lead. Already summarised. */
const LEAD = SAMPLE_LEADS.find((lead) => lead.interactions.length === 5)!;

/** Never summarised, and no interactions — the brand new lead. */
const UNSUMMARISED = SAMPLE_LEADS.find(
  (lead) => lead.summary === null && lead.interactions.length === 0,
)!;

/** Never summarised, but with history — so a failed summary has something to not break. */
const UNSUMMARISED_WITH_HISTORY = SAMPLE_LEADS.find(
  (lead) => lead.summary === null && lead.interactions.length > 0,
)!;

describe('LeadDetailPage', () => {
  let fixture: ComponentFixture<LeadDetailPage>;
  let http: HttpTestingController;

  /**
   * Renders the page for one lead and answers its GET.
   *
   * Per-test rather than in a `beforeEach` because which lead is opened is now
   * the variable under test: whether a summary already exists decides whether
   * the component is allowed to spend a model call.
   */
  async function open(lead: LeadDetail): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: lead.id })) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(LeadDetailPage);
    fixture.detectChanges();

    http.expectOne(`/api/leads/${lead.id}`).flush(lead);

    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    http.verify();
  });

  function texts(selector: string): string[] {
    const nodes = fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
    return Array.from(nodes).map((node) => (node.textContent ?? '').trim());
  }

  function first(selector: string): string {
    return texts(selector)[0] ?? '';
  }

  function summaryUrl(lead: LeadDetail): string {
    return `/api/leads/${lead.id}/summary`;
  }

  /** Lets the summary request settle and repaints. */
  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('fetches the history in the same request as the lead', async () => {
    await open(LEAD);
    // Contract §1: interactions are embedded in LeadDetail, so opening the page
    // is one round trip. A second request here would mean the component had
    // started fetching history separately.
    expect(texts('.history__item').length).toBe(5);
    http.verify();
  });

  it('shows the embedded interaction history newest first', async () => {
    await open(LEAD);
    const items = texts('.history__item');
    expect(items[0]).toContain('Moving to qualified');
    expect(items[items.length - 1]).toContain('Ridgeland open house');
  });

  it('requires confirmation before it will delete anything', async () => {
    await open(LEAD);
    expect(fixture.nativeElement.querySelector('.confirm')).toBeNull();

    (fixture.nativeElement.querySelector('.button--danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.confirm')).toBeTruthy();
    // Opening the confirmation must not have issued the DELETE. Asserting the
    // absent request is direct; the old spec re-fetched the lead and inferred it
    // from the row still being there.
    http.expectNone({ method: 'DELETE', url: `/api/leads/${LEAD.id}` });
  });

  it('logs an interaction and folds the created row into the history', async () => {
    await open(LEAD);
    const notes = fixture.nativeElement.querySelector('#interaction-notes') as HTMLTextAreaElement;
    notes.value = 'Sent the disclosure packet.';
    notes.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.interaction-form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const posted = http.expectOne({
      method: 'POST',
      url: `/api/leads/${LEAD.id}/interactions`,
    });

    // Nothing outside CreateInteractionRequest: the API runs
    // forbidNonWhitelisted, so one stray property is a 400 (Trap #9). Filtering
    // rather than comparing whole sets means a failure names the offending key,
    // and it does not break when the form legitimately starts sending one more
    // of the three permitted fields.
    const permitted = ['type', 'occurredAt', 'notes'];
    const body = posted.request.body as Record<string, unknown>;
    expect(Object.keys(body).filter((key) => !permitted.includes(key))).toEqual([]);

    // The form sends occurredAt rather than leaning on the now() default, for the
    // same reason the create form sends inquiryDate: the default is the
    // database's clock, and the container runs UTC.
    expect(body).toHaveProperty('occurredAt');

    // 201 with the stored row, the way POST /api/leads/:leadId/interactions
    // actually answers.
    const created: Interaction = {
      id: 'c0ffee00-0000-4000-8000-000000000001',
      leadId: LEAD.id,
      type: 'note',
      occurredAt: '2026-08-07T12:00:00.000Z',
      notes: 'Sent the disclosure packet.',
      createdAt: '2026-08-07T12:00:00.000Z',
      updatedAt: '2026-08-07T12:00:00.000Z',
    };
    posted.flush(created, { status: 201, statusText: 'Created' });

    await settle();

    // Folded in locally rather than re-fetched — that is the point of returning
    // the created resource from a POST.
    const items = texts('.history__item');
    expect(items.length).toBe(6);
    expect(items[0]).toContain('Sent the disclosure packet.');
    http.expectNone(`/api/leads/${LEAD.id}`);
  });

  // --- AI summary -----------------------------------------------------------

  describe('the AI summary card', () => {
    it('generates one summary, once, when the server has none', async () => {
      await open(UNSUMMARISED);

      const posted = http.match({ method: 'POST', url: summaryUrl(UNSUMMARISED) });
      expect(posted.length).toBe(1);
      // The lead id in the path is the whole request; the server takes no input.
      expect(posted[0]!.request.body).toEqual({});

      // The lead is on screen already, and only the card is pending.
      expect(first('.details')).toContain(UNSUMMARISED.email);
      expect(first('.loading')).toContain('Generating summary');

      const summary = sampleSummary({ urgency: 'high' });
      posted[0]!.flush(summary);
      await settle();

      expect(first('.summary__narrative')).toBe(summary.narrative);
      expect(first('.summary__next')).toBe(summary.nextAction);
      expect(first('.summary__urgency--high')).toBe(EXPECTED_URGENCY_LABELS.high);
      // Provenance: a bad summary has to be traceable to a model.
      expect(first('.summary__meta')).toContain(summary.model);
      expect(fixture.nativeElement.querySelector('.loading')).toBeNull();

      // Change detection must not be able to trigger a second one. If the
      // generate ever moves into the template or a computed, this is where it
      // surfaces — and every repaint would be billable.
      fixture.detectChanges();
      fixture.detectChanges();
      http.expectNone({ method: 'POST', url: summaryUrl(UNSUMMARISED) });
    });

    it('spends nothing on a lead the server has already summarised', async () => {
      // This is the test that protects the entire cost model. If it regresses,
      // every page view pays for a model call again.
      await open(LEAD);

      fixture.detectChanges();
      fixture.detectChanges();

      http.expectNone({ method: 'POST', url: summaryUrl(LEAD) });
      expect(first('.summary__narrative')).toBe(LEAD.summary!.narrative);
    });

    it('keeps the old summary on screen while a regenerate is in flight', async () => {
      await open(LEAD);
      const before = LEAD.summary!;

      (fixture.nativeElement.querySelector('.summary__foot .button') as HTMLButtonElement).click();
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        '.summary__foot .button',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.textContent!.trim()).toBe('Regenerating…');
      // Not blanked: the previous summary is still the best information available.
      expect(first('.summary__narrative')).toBe(before.narrative);

      const next = sampleSummary({
        narrative: 'A second read of the same record, differently phrased.',
        nextAction: 'Call Amara about the Kenilworth foursquare before Saturday.',
        urgency: 'low',
        generatedAt: '2026-09-15T16:05:00.000Z',
      });
      http.expectOne({ method: 'POST', url: summaryUrl(LEAD) }).flush(next);
      await settle();

      expect(first('.summary__narrative')).toBe(next.narrative);
      expect(first('.summary__next')).toBe(next.nextAction);
      // The timestamp has to move, or a regenerate is indistinguishable from a
      // no-op. Asserting the rendered date rather than the ISO string, because
      // the muted line is what the salesperson actually reads.
      expect(first('.summary__meta')).toContain('Sep 15, 2026');
      expect(first('.summary__meta')).not.toContain('Aug 2, 2026');
      expect(first('.summary__urgency--low')).toBe(EXPECTED_URGENCY_LABELS.low);

      const restored = fixture.nativeElement.querySelector(
        '.summary__foot .button',
      ) as HTMLButtonElement;
      expect(restored.disabled).toBe(false);
      expect(restored.textContent!.trim()).toBe('Regenerate');
    });

    it('reports a failed summary without taking the rest of the page down', async () => {
      await open(UNSUMMARISED_WITH_HISTORY);

      // 429/502/503 are one family per the API contract: show the server's
      // message verbatim. This is the 503 the API sends when Anthropic is down.
      const body: ApiError = {
        statusCode: 503,
        message: 'The summarisation service is unavailable. Try again shortly.',
        error: 'Service Unavailable',
      };
      http
        .expectOne({ method: 'POST', url: summaryUrl(UNSUMMARISED_WITH_HISTORY) })
        .flush(body, { status: 503, statusText: 'Service Unavailable' });
      await settle();

      expect(texts('.errors li')).toContain(
        'The summarisation service is unavailable. Try again shortly.',
      );

      // The whole point of keeping the summary's state separate from the page's:
      // everything that does not depend on the model is still there and usable.
      expect(first('.details')).toContain(UNSUMMARISED_WITH_HISTORY.email);
      expect(fixture.nativeElement.querySelector('.interaction-form')).toBeTruthy();
      expect(texts('.history__item').length).toBe(UNSUMMARISED_WITH_HISTORY.interactions.length);
      // No spinner left running, and a way to try again.
      expect(fixture.nativeElement.querySelector('.loading')).toBeNull();
      expect(texts('.card .button')).toContain('Generate summary');
    });

    it('does not land a slow summary on whichever lead is open by the time it returns', async () => {
      // The request can be in flight for minutes, which is long enough for the
      // user to open something else. Without the id check in the success handler
      // this is a silent data-corruption bug: the wrong lead shows the summary,
      // and it looks entirely plausible.
      const params = new BehaviorSubject<ParamMap>(convertToParamMap({ id: UNSUMMARISED.id }));
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ActivatedRoute, useValue: { paramMap: params } },
        ],
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(LeadDetailPage);
      fixture.detectChanges();

      http.expectOne(`/api/leads/${UNSUMMARISED.id}`).flush(UNSUMMARISED);
      await settle();
      const pending = http.expectOne({ method: 'POST', url: summaryUrl(UNSUMMARISED) });

      // Navigate to an already-summarised lead while that POST is outstanding.
      params.next(convertToParamMap({ id: LEAD.id }));
      http.expectOne(`/api/leads/${LEAD.id}`).flush(LEAD);
      await settle();

      // Now the first lead's summary arrives.
      pending.flush(sampleSummary({ narrative: 'Belongs to the lead we navigated away from.' }));
      await settle();

      expect(first('.summary__narrative')).toBe(LEAD.summary!.narrative);
      expect(first('.summary__narrative')).not.toContain('navigated away');
    });

    // Iterating the value set rather than three hand-written cases: a fourth
    // urgency added to the union arrives here automatically.
    for (const urgency of SUMMARY_URGENCIES) {
      it(`renders the ${urgency} urgency badge with its label and modifier`, async () => {
        await open({ ...LEAD, summary: sampleSummary({ urgency }) });

        const badge = fixture.nativeElement.querySelector(
          `.summary__urgency--${urgency}`,
        ) as HTMLElement;
        expect(badge).toBeTruthy();
        // Accessibility: the colour is reinforcement, the text is the meaning.
        expect(badge.textContent!.trim()).toBe(EXPECTED_URGENCY_LABELS[urgency]);
        // Same pill geometry as the status chip it sits next to.
        expect(badge.classList.contains('status')).toBe(true);
      });
    }
  });

  // --- Activity score -------------------------------------------------------

  describe('the activity score badge', () => {
    function scoreUrl(lead: LeadDetail): string {
      return `/api/leads/${lead.id}/score`;
    }

    /** The first button in the page head's action group. */
    function recalculateButton(): HTMLButtonElement {
      return fixture.nativeElement.querySelector('.page-head .actions button') as HTMLButtonElement;
    }

    function badge(): HTMLElement | null {
      return fixture.nativeElement.querySelector('.page-head .score');
    }

    it('does not request a score on load', async () => {
      // The mirror of "spends nothing on a lead the server has already
      // summarised", and the test that protects the persistence requirement.
      // A score is not a summary: it already exists, the page renders what the
      // server stored, and a POST here would make "scores survive a refresh
      // without recomputation" false while looking entirely correct on screen.
      await open(LEAD);

      fixture.detectChanges();
      fixture.detectChanges();

      http.expectNone({ method: 'POST', url: scoreUrl(LEAD) });
      expect(badge()!.textContent!.trim()).toBe(String(LEAD.activityScore));
    });

    it('renders the stored score with its band and its provenance', async () => {
      await open(LEAD);

      expect(badge()!.classList.contains('score--hot')).toBe(true);
      expect(badge()!.getAttribute('aria-label')).toBe('Activity score 78, hot');
      // Provenance, the reason the timestamp is persisted at all: a score
      // computed before this morning's calls is stale and the user may see it.
      expect(first('.score-meta')).toContain('Aug 7, 2026');
    });

    it('shows an em-dash, not a zero, for a lead that was never scored', async () => {
      await open(UNSUMMARISED);
      // UNSUMMARISED also triggers the summary generate-on-first-view; flush it
      // so `http.verify()` has nothing outstanding to complain about.
      http.expectOne({ method: 'POST', url: summaryUrl(UNSUMMARISED) }).flush(sampleSummary());
      await settle();

      expect(badge()).toBeNull();
      expect(first('.score-empty')).toBe('—');
      expect(first('.score-meta')).toContain('Never scored');
    });

    it('issues one POST and moves the badge and the timestamp', async () => {
      await open(LEAD);

      recalculateButton().click();
      // Twice, for the same reason the list spec clicks twice: the disabled
      // attribute is a rendering detail and the guard in the handler is what
      // makes this one request.
      recalculateButton().click();
      fixture.detectChanges();

      const posted = http.match({ method: 'POST', url: scoreUrl(LEAD) });
      expect(posted.length).toBe(1);
      expect(posted[0]!.request.body).toEqual({});
      expect(recalculateButton().disabled).toBe(true);
      expect(recalculateButton().textContent!.trim()).toBe('Recalculating…');

      // The endpoint answers with a whole `Lead` — no interactions, no summary
      // — which is exactly what `toListRow` models.
      //
      // `status` is deliberately different from the lead on screen. It is what
      // makes this test non-vacuous: the handler patches the two score fields
      // by name, and a `{ ...current, ...scored }` spread would pass every
      // other assertion here while quietly rewriting the record from a payload
      // the user did not ask for. Verified by making that substitution and
      // watching only this line fail.
      posted[0]!.flush({
        ...toListRow(LEAD),
        status: 'lost',
        activityScore: 24,
        scoreCalculatedAt: '2026-09-21T11:30:00.000Z',
      });
      await settle();

      expect(badge()!.textContent!.trim()).toBe('24');
      expect(badge()!.classList.contains('score--cold')).toBe(true);
      expect(badge()!.classList.contains('score--hot')).toBe(false);
      expect(first('.score-meta')).toContain('Sep 21, 2026');
      expect(recalculateButton().disabled).toBe(false);

      // A button that says "Recalculate score" changes the score. Nothing else
      // on the record moves, and nothing the response omitted was lost.
      expect(first('.details')).toContain('Qualified');
      expect(texts('.history__item').length).toBe(5);
      expect(first('.summary__narrative')).toBe(LEAD.summary!.narrative);
    });

    it('reports a failed recalculation without disturbing the summary card', async () => {
      await open(LEAD);

      recalculateButton().click();
      fixture.detectChanges();

      const body: ApiError = {
        statusCode: 503,
        message: 'Service Unavailable',
        error: 'Service Unavailable',
      };
      http
        .expectOne({ method: 'POST', url: scoreUrl(LEAD) })
        .flush(body, { status: 503, statusText: 'Service Unavailable' });
      await settle();

      expect(texts('.errors--score li').length).toBe(1);
      // Its own error line, and its own state. The badge keeps the score the
      // server already had, and the card next to it is untouched — the whole
      // reason `rescoring` is not `summarizing`.
      expect(badge()!.textContent!.trim()).toBe(String(LEAD.activityScore));
      expect(first('.summary__narrative')).toBe(LEAD.summary!.narrative);
      expect(texts('.history__item').length).toBe(5);
      expect(recalculateButton().disabled).toBe(false);
    });

    it('does not land a slow score on whichever lead is open by the time it returns', async () => {
      // Milliseconds rather than the summary's minutes, so the window is
      // narrow — but a narrow window for writing one lead's score onto another
      // is still one, and the guard costs a line.
      const params = new BehaviorSubject<ParamMap>(convertToParamMap({ id: LEAD.id }));
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: ActivatedRoute, useValue: { paramMap: params } },
        ],
      });
      http = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(LeadDetailPage);
      fixture.detectChanges();

      http.expectOne(`/api/leads/${LEAD.id}`).flush(LEAD);
      await settle();

      recalculateButton().click();
      fixture.detectChanges();
      const pending = http.expectOne({ method: 'POST', url: scoreUrl(LEAD) });

      // Navigate to another lead while that POST is outstanding.
      params.next(convertToParamMap({ id: UNSUMMARISED_WITH_HISTORY.id }));
      http.expectOne(`/api/leads/${UNSUMMARISED_WITH_HISTORY.id}`).flush(UNSUMMARISED_WITH_HISTORY);
      await settle();
      http
        .expectOne({ method: 'POST', url: summaryUrl(UNSUMMARISED_WITH_HISTORY) })
        .flush(sampleSummary());
      await settle();

      pending.flush({
        ...toListRow(LEAD),
        activityScore: 3,
        scoreCalculatedAt: '2026-09-21T11:30:00.000Z',
      });
      await settle();

      // The second lead's own score, not the first lead's late arrival.
      expect(badge()!.textContent!.trim()).toBe(String(UNSUMMARISED_WITH_HISTORY.activityScore));
    });
  });
});
