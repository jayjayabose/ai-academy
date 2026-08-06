import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { apiErrorMessages } from '../core/api-error';
import { LeadService } from '../core/lead.service';
import { fixtureInterceptor, resetFixtureState } from './fixture.interceptor';

/**
 * These exercise `LeadService` — the real client — against the fixture backend.
 * When apps/api lands and the interceptor is deleted, this file goes with it;
 * the service and the components it verifies do not change.
 */
describe('LeadService against the fixture backend', () => {
  let service: LeadService;

  beforeEach(() => {
    resetFixtureState();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([fixtureInterceptor]))],
    });
    service = TestBed.inject(LeadService);
  });

  it('lists leads without interactions, and details them with', async () => {
    const leads = await firstValueFrom(service.list());
    expect(leads.length).toBe(10);
    expect(leads.every((lead) => !('interactions' in lead))).toBe(true);

    const withFive = leads.find((lead) => lead.lastName === 'Okafor');
    const detail = await firstValueFrom(service.get(withFive!.id));
    expect(detail.interactions.length).toBe(5);
  });

  it('covers the null shapes the UI has to survive', async () => {
    const leads = await firstValueFrom(service.list());
    expect(leads.some((l) => l.propertyType === 'land' && l.bedrooms === null)).toBe(true);
    expect(leads.some((l) => l.budget === null)).toBe(true);
    expect(leads.some((l) => l.location === null && l.propertyType === null)).toBe(true);

    const empty = leads.find((l) => l.lastName === 'Whitfield');
    const detail = await firstValueFrom(service.get(empty!.id));
    expect(detail.interactions).toEqual([]);
  });

  it('applies the DB defaults when create omits status and inquiryDate', async () => {
    const created = await firstValueFrom(
      service.create({ firstName: 'Ada', lastName: 'Lovelace', email: 'ADA@Example.com' }),
    );
    expect(created.status).toBe('active');
    expect(created.inquiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Normalised to lowercase on write.
    expect(created.email).toBe('ada@example.com');
    expect(created.budget).toBeNull();
  });

  it('PATCHes a subset: null clears, an absent key is left alone', async () => {
    const [first] = await firstValueFrom(service.list());
    const updated = await firstValueFrom(service.update(first!.id, { budget: null }));
    expect(updated.budget).toBeNull();
    expect(updated.firstName).toBe(first!.firstName);
  });

  it('rejects a PATCH body that carries id/createdAt, as forbidNonWhitelisted does', async () => {
    const [first] = await firstValueFrom(service.list());
    // Exactly what spreading a fetched Lead into the payload would produce.
    const spread = { ...first, budget: 1 } as unknown as Record<string, unknown>;

    const error = await firstValueFrom(service.update(first!.id, spread)).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(HttpErrorResponse);
    const messages = apiErrorMessages(error);
    expect(messages).toContain('property id should not exist');
    expect(messages).toContain('property createdAt should not exist');
    // The array form of ApiError.message must survive as separate lines.
    expect(messages.length).toBeGreaterThan(1);
  });

  it('reports validation failures per field', async () => {
    const error = await firstValueFrom(
      service.create({ firstName: '', lastName: 'X', email: 'nope', budget: 999_999_999 }),
    ).catch((caught: unknown) => caught);

    const messages = apiErrorMessages(error);
    expect(messages).toContain('firstName should not be empty');
    expect(messages).toContain('email must be an email');
    expect(messages).toContain('budget must not be greater than 100000000');
  });

  it('appends an interaction and defaults occurredAt to now', async () => {
    const leads = await firstValueFrom(service.list());
    const target = leads.find((lead) => lead.lastName === 'Whitfield')!;

    const created = await firstValueFrom(
      service.logInteraction(target.id, { type: 'call', notes: 'Left a voicemail.' }),
    );
    expect(created.leadId).toBe(target.id);
    expect(created.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const detail = await firstValueFrom(service.get(target.id));
    expect(detail.interactions.map((i) => i.id)).toContain(created.id);
  });

  it('deletes a lead and 404s afterwards', async () => {
    const [first] = await firstValueFrom(service.list());
    await firstValueFrom(service.delete(first!.id));

    const remaining = await firstValueFrom(service.list());
    expect(remaining.length).toBe(9);

    const error = await firstValueFrom(service.get(first!.id)).catch(
      (caught: unknown) => caught,
    );
    expect((error as HttpErrorResponse).status).toBe(404);
    expect(apiErrorMessages(error)).toEqual(['Lead not found']);
  });
});
