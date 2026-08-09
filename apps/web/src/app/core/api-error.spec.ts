import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '@ai-academy/shared';

import { apiErrorMessages, isNotFound } from './api-error';

/**
 * The distinction this file exists to protect: a failure the API *authored* has
 * its own wording and the user should see it verbatim, while a failure that
 * merely happened *near* the API has only HttpClient's developer-facing string,
 * which the user should never see.
 *
 * Written after Gate 5 put "Http failure response for http://localhost:4300/api/
 * leads/…/summary: 502 Bad Gateway" on screen — the dev proxy answers 502 when
 * nothing is listening on 3000, so the status-0 branch never ran.
 */
function httpError(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: '/api/leads/x/summary' });
}

describe('apiErrorMessages', () => {
  it("shows the API's own message verbatim, whatever the status", () => {
    // The summariser's 503. The wording is deliberate and server-side, and it is
    // the whole reason 429/502/503 can be treated as one family in the UI.
    const body: ApiError = {
      statusCode: 503,
      message: 'The summarisation service is unavailable. Try again shortly.',
      error: 'Service Unavailable',
    };
    expect(apiErrorMessages(httpError(503, body))).toEqual([
      'The summarisation service is unavailable. Try again shortly.',
    ]);
  });

  it('splits a ValidationPipe array into one line per field', () => {
    const body: ApiError = {
      statusCode: 400,
      message: ['email must be an email', 'budget must not be less than 0'],
      error: 'Bad Request',
    };
    expect(apiErrorMessages(httpError(400, body))).toEqual([
      'email must be an email',
      'budget must not be less than 0',
    ]);
  });

  it('translates an unreachable API into something a salesperson can act on', () => {
    const readable = ['Could not reach the server. Check that the API is running.'];
    // The browser refusing to connect...
    expect(apiErrorMessages(httpError(0, null))).toEqual(readable);
    // ...and the proxy or load balancer answering for a dead API. The body is
    // whatever that intermediary sends, which is not an ApiError.
    expect(apiErrorMessages(httpError(502, 'Bad Gateway'))).toEqual(readable);
    expect(apiErrorMessages(httpError(504, ''))).toEqual(readable);
  });

  it("never leaks HttpClient's own wording for a dead backend", () => {
    for (const status of [0, 502, 503, 504]) {
      expect(apiErrorMessages(httpError(status, 'Bad Gateway'))[0]).not.toContain('Http failure');
    }
  });

  it('falls back to one readable line for anything else', () => {
    expect(apiErrorMessages(new Error('boom'))).toEqual(['boom']);
    expect(apiErrorMessages('a bare string')).toEqual(['Something went wrong.']);
  });
});

describe('isNotFound', () => {
  it('is true only for a 404', () => {
    expect(isNotFound(httpError(404, null))).toBe(true);
    expect(isNotFound(httpError(502, null))).toBe(false);
    expect(isNotFound(new Error('404'))).toBe(false);
  });
});
