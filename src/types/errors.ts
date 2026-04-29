// Discriminated union types for errors

export type CourseraError =
  | {
      type: 'AUTH_ERROR';
      message: string;
      code: 'INVALID_CREDENTIALS' | 'TOTP_INVALID' | 'TOTP_EXPIRED' | 'SESSION_EXPIRED';
      statusCode: 401 | 403;
      details?: {
        reason?: string;
        attemptsRemaining?: number;
      };
    }
  | {
      type: 'NETWORK_ERROR';
      message: string;
      code: 'CONNECTION_TIMEOUT' | 'CONNECTION_REFUSED' | 'DNS_RESOLUTION_FAILED' | 'TLS_ERROR';
      statusCode: 0 | 503 | 504;
      details?: {
        originalError?: string;
        retryAfterSeconds?: number;
      };
    }
  | {
      type: 'VALIDATION_ERROR';
      message: string;
      code: 'INVALID_INPUT' | 'SCHEMA_VALIDATION_FAILED' | 'MISSING_REQUIRED_FIELD';
      statusCode: 400;
      details?: {
        field?: string;
        expectedType?: string;
        receivedValue?: unknown;
      };
    }
  | {
      type: 'RATE_LIMIT';
      message: string;
      code: 'RATE_LIMIT_EXCEEDED' | 'QUOTA_EXCEEDED';
      statusCode: 429;
      details?: {
        retryAfterSeconds: number;
        limit: number;
        remaining: number;
      };
    }
  | {
      type: 'SERVICE_UNAVAILABLE';
      message: string;
      code: 'MAINTENANCE' | 'SERVICE_DEGRADED' | 'CIRCUIT_BREAKER_OPEN';
      statusCode: 503 | 502;
      details?: {
        availableAt?: string;
        reason?: string;
      };
    }
  | {
      type: 'NOT_FOUND';
      message: string;
      code: 'RESOURCE_NOT_FOUND' | 'COURSE_NOT_FOUND' | 'USER_NOT_FOUND' | 'PROGRAM_NOT_FOUND';
      statusCode: 404;
      details?: {
        resourceId?: string;
        resourceType?: string;
      };
    }
  | {
      type: 'INTERNAL_SERVER_ERROR';
      message: string;
      code: 'UNEXPECTED_ERROR' | 'DATABASE_ERROR' | 'EXTERNAL_API_ERROR';
      statusCode: 500;
      details?: {
        requestId?: string;
        timestamp?: string;
      };
    };

// Type guard functions
export function isAuthError(error: CourseraError): error is Extract<CourseraError, { type: 'AUTH_ERROR' }> {
  return error.type === 'AUTH_ERROR';
}

export function isNetworkError(error: CourseraError): error is Extract<CourseraError, { type: 'NETWORK_ERROR' }> {
  return error.type === 'NETWORK_ERROR';
}

export function isValidationError(
  error: CourseraError
): error is Extract<CourseraError, { type: 'VALIDATION_ERROR' }> {
  return error.type === 'VALIDATION_ERROR';
}

export function isRateLimitError(error: CourseraError): error is Extract<CourseraError, { type: 'RATE_LIMIT' }> {
  return error.type === 'RATE_LIMIT';
}

export function isServiceUnavailableError(
  error: CourseraError
): error is Extract<CourseraError, { type: 'SERVICE_UNAVAILABLE' }> {
  return error.type === 'SERVICE_UNAVAILABLE';
}

export function isNotFoundError(error: CourseraError): error is Extract<CourseraError, { type: 'NOT_FOUND' }> {
  return error.type === 'NOT_FOUND';
}

export function isInternalServerError(
  error: CourseraError
): error is Extract<CourseraError, { type: 'INTERNAL_SERVER_ERROR' }> {
  return error.type === 'INTERNAL_SERVER_ERROR';
}

// Error creation helpers
export const createAuthError = (
  code: CourseraError & { type: 'AUTH_ERROR' } extends { code: infer C } ? C : never,
  message: string,
  details?: CourseraError & { type: 'AUTH_ERROR' } extends { details: infer D } ? D : never
): Extract<CourseraError, { type: 'AUTH_ERROR' }> => ({
  type: 'AUTH_ERROR',
  code,
  message,
  statusCode: 401,
  details,
});

export const createNetworkError = (
  code: CourseraError & { type: 'NETWORK_ERROR' } extends { code: infer C } ? C : never,
  message: string,
  details?: CourseraError & { type: 'NETWORK_ERROR' } extends { details: infer D } ? D : never
): Extract<CourseraError, { type: 'NETWORK_ERROR' }> => ({
  type: 'NETWORK_ERROR',
  code,
  message,
  statusCode: 503,
  details,
});

export const createValidationError = (
  message: string,
  details?: CourseraError & { type: 'VALIDATION_ERROR' } extends { details: infer D } ? D : never
): Extract<CourseraError, { type: 'VALIDATION_ERROR' }> => ({
  type: 'VALIDATION_ERROR',
  code: 'INVALID_INPUT',
  message,
  statusCode: 400,
  details,
});

export const createRateLimitError = (
  retryAfterSeconds: number,
  message?: string
): Extract<CourseraError, { type: 'RATE_LIMIT' }> => ({
  type: 'RATE_LIMIT',
  code: 'RATE_LIMIT_EXCEEDED',
  message: message || 'Rate limit exceeded',
  statusCode: 429,
  details: {
    retryAfterSeconds,
    limit: 0,
    remaining: 0,
  },
});

export const createServiceUnavailableError = (
  message: string,
  details?: CourseraError & { type: 'SERVICE_UNAVAILABLE' } extends { details: infer D } ? D : never
): Extract<CourseraError, { type: 'SERVICE_UNAVAILABLE' }> => ({
  type: 'SERVICE_UNAVAILABLE',
  code: 'SERVICE_DEGRADED',
  message,
  statusCode: 503,
  details,
});
