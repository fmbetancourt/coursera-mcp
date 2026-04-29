// Sanitize sensitive data from logs

const SENSITIVE_FIELDS = new Set([
  'password',
  'passwd',
  'pwd',
  'token',
  'accessToken',
  'sessionToken',
  'refreshToken',
  'apiKey',
  'secret',
  'apiSecret',
  'email',
  'emailAddress',
  'creditCard',
  'cardNumber',
  'ssn',
  'socialSecurityNumber',
  'privateKey',
  'privateKeyPem',
  'totpSecret',
  'backupCode',
  'totpToken',
  'mfaToken',
  'authorization',
  'x-api-key',
]);

const REDACTION_PLACEHOLDER = '[REDACTED]';

export function sanitizeForLogging(
  obj: unknown,
  maxDepth = 5,
  currentDepth = 0
): unknown {
  if (currentDepth >= maxDepth) {
    return obj;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLogging(item, maxDepth, currentDepth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_FIELDS.has(lowerKey)) {
        sanitized[key] = REDACTION_PLACEHOLDER;
      } else {
        sanitized[key] = sanitizeForLogging(value, maxDepth, currentDepth + 1);
      }
    }

    return sanitized;
  }

  return obj;
}

export function createSanitizer() {
  return function (info: Record<string, unknown>): Record<string, unknown> {
    return sanitizeForLogging(info);
  };
}
