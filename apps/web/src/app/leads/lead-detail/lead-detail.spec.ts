import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { LeadService } from '../../core/lead.service';
import { FIXTURE_LEADS } from '../../fixtures/leads.fixture';
import { fixtureInterceptor, resetFixtureState } from '../../fixtures/fixture.interceptor';
import { LeadDetailPage } from './lead-detail';

/** The five-interaction lead. */
const LEAD = FIXTURE_LEADS.find((lead) => lead.interactions.length === 5)!;

describe('LeadDetailPage', () => {
  let fixture: ComponentFixture<LeadDetailPage>;

  beforeEach(async () => {
    resetFixtureState();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([fixtureInterceptor])),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: LEAD.id })) },
        },
      ],
    });
    fixture = TestBed.createComponent(LeadDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function texts(selector: string): string[] {
    const nodes = fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
    return Array.from(nodes).map((node) => (node.textContent ?? '').trim());
  }

  it('shows the embedded interaction history newest first', () => {
    const items = texts('.history__item');
    expect(items.length).toBe(5);
    expect(items[0]).toContain('Moving to qualified');
    expect(items[items.length - 1]).toContain('Ridgeland open house');
  });

  it('requires confirmation before it will delete anything', async () => {
    expect(fixture.nativeElement.querySelector('.confirm')).toBeNull();

    (fixture.nativeElement.querySelector('.button--danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.confirm')).toBeTruthy();
    // Still there: opening the confirmation must not have issued the request.
    const stillThere = await firstValueFrom(TestBed.inject(LeadService).get(LEAD.id));
    expect(stillThere.id).toBe(LEAD.id);
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
    await fixture.whenStable();
    fixture.detectChanges();

    const items = texts('.history__item');
    expect(items.length).toBe(6);
    expect(items[0]).toContain('Sent the disclosure packet.');
  });
});
