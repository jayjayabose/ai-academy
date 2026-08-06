import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '@ai-academy/shared';

/**
 * `ApiError.message` is `string | string[]` — NestJS's ValidationPipe reports
 * per-field failures as an array, everything else as a single string. Both forms
 * arrive on the same property, so every call site would otherwise need the same
 * `Array.isArray` dance. It lives here once instead.
 */

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ApiError>;
  return (
    typeof candidate.statusCode === 'number' &&
    (typeof candidate.message === 'string' || Array.isArray(candidate.message))
  );
}

/**
 * Normalises anything thrown by HttpClient into a list of human-readable lines.
 * A 400 from ValidationPipe yields one line per failed field; everything else
 * yields exactly one line.
 */
export function apiErrorMessages(error: unknown): string[] {
  if (error instanceof HttpErrorResponse) {
    if (isApiError(error.error)) {
      const { message } = error.error;
      const lines = Array.isArray(message) ? message : [message];
      const nonEmpty = lines.filter((line) => typeof line === 'string' && line.length > 0);
      if (nonEmpty.length > 0) return nonEmpty;
    }
    if (error.status === 0) {
      return ['Could not reach the server. Check that the API is running.'];
    }
    return [error.message];
  }
  if (error instanceof Error) return [error.message];
  return ['Something went wrong.'];
}

/** True when the request failed because the resource does not exist. */
export function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
