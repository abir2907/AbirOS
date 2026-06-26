import { ERROR_CODES, type ErrorCode } from '@abiros/shared';

/** Throwable HTTP error carrying a stable code + status; rendered by the error middleware. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static unauthorized(message = 'Authentication required') {
    return new HttpError(401, ERROR_CODES.UNAUTHORIZED, message);
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, ERROR_CODES.NOT_FOUND, message);
  }
  static validation(message = 'Invalid request', details?: unknown) {
    return new HttpError(400, ERROR_CODES.VALIDATION, message, details);
  }
  static notImplemented(message = 'Not implemented in this phase') {
    return new HttpError(501, ERROR_CODES.NOT_IMPLEMENTED, message);
  }
}
