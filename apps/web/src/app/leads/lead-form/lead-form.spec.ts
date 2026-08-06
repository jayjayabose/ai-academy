import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';

import { LeadService } from '../../core/lead.service';
import { FIXTURE_LEADS } from '../../fixtures/leads.fixture';
import { fixtureInterceptor, resetFixtureState } from '../../fixtures/fixture.interceptor';
import { LeadForm } from './lead-form';

const EXISTING = FIXTURE_LEADS[0]!;

describe('LeadForm in edit mode', () => {
  let fixture: ComponentFixture<LeadForm>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    resetFixtureState();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([fixtureInterceptor])),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: EXISTING.id })) },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LeadForm);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function input(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  }

  it('populates from the fetched lead', () => {
    expect(input('#firstName').value).toBe(EXISTING.firstName);
    expect(input('#email').value).toBe(EXISTING.email);
    expect(input('#inquiryDate').value).toBe(EXISTING.inquiryDate);
  });

  it('PATCHes successfully, which means the payload carried no id/createdAt', async () => {
    const budget = input('#budget');
    budget.value = '401000';
    budget.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    // A payload built by spreading the fetched Lead would have produced a 400
    // and left these two assertions failing.
    expect(fixture.nativeElement.querySelectorAll('.errors li').length).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/leads', EXISTING.id]);

    const saved = await firstValueFrom(TestBed.inject(LeadService).get(EXISTING.id));
    expect(saved.budget).toBe(401000);
  });

  it('blocks submission on a client-side rule instead of round-tripping to a 400', async () => {
    const email = input('#email');
    email.value = 'not-an-email';
    email.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.field--invalid')).toBeTruthy();
  });
});
