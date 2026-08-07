import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import type { Interaction } from '@ai-academy/shared';
import { of } from 'rxjs';

import { SAMPLE_LEADS } from '../../testing/lead-samples';
import { LeadDetailPage } from './lead-detail';

/** The five-interaction lead. */
const LEAD = SAMPLE_LEADS.find((lead) => lead.interactions.length === 5)!;

describe('LeadDetailPage', () => {
  let fixture: ComponentFixture<LeadDetailPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: LEAD.id })) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(LeadDetailPage);
    fixture.detectChanges();

    http.expectOne(`/api/leads/${LEAD.id}`).flush(LEAD);

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  function texts(selector: string): string[] {
    const nodes = fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
    return Array.from(nodes).map((node) => (node.textContent ?? '').trim());
  }

  it('fetches the history in the same request as the lead', () => {
    // Contract §1: interactions are embedded in LeadDetail, so opening the page
    // is one round trip. A second request here would mean the component had
    // started fetching history separately.
    expect(texts('.history__item').length).toBe(5);
    http.verify();
  });

  it('shows the embedded interaction history newest first', () => {
    const items = texts('.history__item');
    expect(items[0]).toContain('Moving to qualified');
    expect(items[items.length - 1]).toContain('Ridgeland open house');
  });

  it('requires confirmation before it will delete anything', () => {
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
    const notes = fixture.nativeElement.querySelector(
      '#interaction-notes',
    ) as HTMLTextAreaElement;
    notes.value = 'Sent the disclosure packet.';
    notes.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('.interaction-form') as HTMLFormElement
    ).dispatchEvent(new Event('submit'));

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

    await fixture.whenStable();
    fixture.detectChanges();

    // Folded in locally rather than re-fetched — that is the point of returning
    // the created resource from a POST.
    const items = texts('.history__item');
    expect(items.length).toBe(6);
    expect(items[0]).toContain('Sent the disclosure packet.');
    http.expectNone(`/api/leads/${LEAD.id}`);
  });
});
