import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SAMPLE_LEADS } from '../../testing/lead-samples';
import { LeadForm } from './lead-form';

const EXISTING = SAMPLE_LEADS[0]!;

/** Everything the API returns that is NOT part of UpdateLeadRequest. */
const READ_ONLY_FIELDS = ['id', 'createdAt', 'updatedAt', 'interactions'];

describe('LeadForm in edit mode', () => {
  let fixture: ComponentFixture<LeadForm>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: EXISTING.id })) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LeadForm);
    fixture.detectChanges();

    http.expectOne(`/api/leads/${EXISTING.id}`).flush(EXISTING);

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  function input(selector: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  }

  function submit(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
  }

  it('populates from the fetched lead', () => {
    expect(input('#firstName').value).toBe(EXISTING.firstName);
    expect(input('#email').value).toBe(EXISTING.email);
    expect(input('#inquiryDate').value).toBe(EXISTING.inquiryDate);
  });

  it('sends a PATCH payload carrying nothing the API would reject', async () => {
    // Trap #9 asserted directly. The API runs forbidNonWhitelisted, so a payload
    // built by spreading the fetched Lead answers 400 "property id should not
    // exist". The old spec inferred this from a fixture not returning an error —
    // which proved only that the fixture agreed with a guess. This reads the
    // request.
    const budget = input('#budget');
    budget.value = '401000';
    budget.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submit();

    const patched = http.expectOne({ method: 'PATCH', url: `/api/leads/${EXISTING.id}` });
    const body = patched.request.body as Record<string, unknown>;

    for (const field of READ_ONLY_FIELDS) {
      expect(body).not.toHaveProperty(field);
    }
    expect(body['budget']).toBe(401000);

    patched.flush({ ...EXISTING, budget: 401000 });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.errors li').length).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/leads', EXISTING.id]);
  });

  it('renders the API validation messages when the server rejects the payload', async () => {
    // The exact body the real ValidationPipe returns — captured from
    // POST /api/leads, not reconstructed. This is what the old fixture layer was
    // guessing at, and the guess is now checkable.
    submit();

    http.expectOne({ method: 'PATCH', url: `/api/leads/${EXISTING.id}` }).flush(
      {
        message: [
          'firstName must be longer than or equal to 1 characters',
          'email must be an email',
        ],
        error: 'Bad Request',
        statusCode: 400,
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await fixture.whenStable();
    fixture.detectChanges();

    const errors = Array.from(
      fixture.nativeElement.querySelectorAll('.errors li') as NodeListOf<HTMLElement>,
    ).map((node) => (node.textContent ?? '').trim());

    expect(errors).toEqual([
      'firstName must be longer than or equal to 1 characters',
      'email must be an email',
    ]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('blocks submission on a client-side rule instead of round-tripping to a 400', () => {
    const email = input('#email');
    email.value = 'not-an-email';
    email.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    submit();

    // No request at all: the frontend enforces the same rules so the user is not
    // waiting on a server round trip to be told the email is malformed.
    http.expectNone({ method: 'PATCH', url: `/api/leads/${EXISTING.id}` });
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.field--invalid')).toBeTruthy();
  });
});
