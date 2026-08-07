import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateInteractionRequest,
  CreateLeadRequest,
  Interaction,
  Lead,
  LeadDetail,
  UpdateLeadRequest,
} from '@ai-academy/shared';

/**
 * The real API client. There is no second implementation and no base URL:
 * Decision 7 puts the dev server and the API on the same origin via
 * `proxy.conf.json`, so every path here is relative and CORS does not exist.
 *
 * Every path is answered by apps/api. Until it existed a fixtureInterceptor
 * answered these exact requests in-process; removing it changed nothing here,
 * which was the point of writing the real client first.
 */
@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly http = inject(HttpClient);

  /** GET /api/leads -> full `Lead` rows (no interactions — that is `LeadDetail`). */
  list(): Observable<Lead[]> {
    return this.http.get<Lead[]>('/api/leads');
  }

  /** GET /api/leads/:id -> `LeadDetail`, interactions embedded. One request. */
  get(id: string): Observable<LeadDetail> {
    return this.http.get<LeadDetail>(`/api/leads/${encodeURIComponent(id)}`);
  }

  /** POST /api/leads -> 201 Lead. */
  create(body: CreateLeadRequest): Observable<Lead> {
    return this.http.post<Lead>('/api/leads', body);
  }

  /**
   * PATCH /api/leads/:id -> 200 Lead.
   *
   * `body` must be built field by field from `UpdateLeadRequest`. Spreading a
   * fetched `Lead` carries `id`/`createdAt`/`updatedAt` into the payload and the
   * API's ValidationPipe (`forbidNonWhitelisted: true`) answers 400
   * "property id should not exist".
   */
  update(id: string, body: UpdateLeadRequest): Observable<Lead> {
    return this.http.patch<Lead>(`/api/leads/${encodeURIComponent(id)}`, body);
  }

  /** DELETE /api/leads/:id -> 204. Interactions cascade server-side. */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/leads/${encodeURIComponent(id)}`);
  }

  /** POST /api/leads/:leadId/interactions -> 201 Interaction. */
  logInteraction(leadId: string, body: CreateInteractionRequest): Observable<Interaction> {
    return this.http.post<Interaction>(
      `/api/leads/${encodeURIComponent(leadId)}/interactions`,
      body,
    );
  }
}
