import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateInteractionRequest,
  CreateLeadRequest,
  Interaction,
  Lead,
  LeadDetail,
  LeadSummary,
  UpdateLeadRequest,
} from '@ai-academy/shared';

/**
 * The real API client. There is no second implementation and no base URL:
 * Decision 7 puts the dev server and the API on the same origin via
 * `proxy.conf.js`, so every path here is relative and CORS does not exist.
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

  /**
   * POST /api/leads/:id/summary -> 200 LeadSummary. Generates and persists;
   * overwrites any existing summary.
   *
   * The empty body is deliberate, not an oversight: the server needs no input,
   * so the lead id in the path is the whole request. 200 rather than the 201 the
   * other POSTs answer with, because regenerating replaces a summary in place.
   *
   * One model call, so this is slow by the standards of everything else here —
   * seconds, and the client tolerates minutes. Callers need a pending state.
   */
  summarize(id: string): Observable<LeadSummary> {
    return this.http.post<LeadSummary>(`/api/leads/${encodeURIComponent(id)}/summary`, {});
  }

  /**
   * POST /api/leads/:id/score -> 200 Lead. Recomputes and persists one score.
   *
   * The empty body is deliberate, as in `summarize`: the server needs no input,
   * so the lead id in the path is the whole request. 200 rather than 201,
   * because a recalculation replaces a score in place.
   *
   * Unlike `summarize`, which answers with just the summary, this answers with
   * the WHOLE lead — both score fields live on `Lead` itself, so there is no
   * nested wire type and nothing to splice. Note for the detail page: this is a
   * `Lead`, not a `LeadDetail`. Spreading it over the current record would drop
   * `interactions` and `summary`; patch the two fields instead.
   *
   * Arithmetic server-side, not a model call, so this returns in milliseconds —
   * callers still need a pending state to guard against double-submit, but not
   * the minutes-long tolerance `summarize` needs.
   */
  rescore(id: string): Observable<Lead> {
    return this.http.post<Lead>(`/api/leads/${encodeURIComponent(id)}/score`, {});
  }

  /**
   * POST /api/leads/scores/recalculate -> 200 Lead[]. Recomputes the whole book.
   *
   * Returns every row in the same order `list()` does — Task A made the two
   * endpoints agree (and added an id tiebreaker to get there), so the caller can
   * replace its rows wholesale and the table cannot reshuffle under the user.
   * Score order is NOT what comes back; sorting is the client's job.
   *
   * A literal path segment where `:id` would go. It is declared before
   * `:id/score` on the server, though Task A measured that the two cannot
   * actually collide — `scores/recalculate` fails to match `:id/score` on the
   * second segment either way round.
   */
  rescoreAll(): Observable<Lead[]> {
    return this.http.post<Lead[]>('/api/leads/scores/recalculate', {});
  }
}
