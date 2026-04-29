import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
};

// Determine if an error is transitory and should be retried
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('dns')
    ) {
      return true;
    }

    // HTTP 5xx errors
    if (error instanceof Error && error.message.includes('5')) {
      return true;
    }
  }

  // Check for axios-like error objects
  const axiosError = error as Record<string, unknown>;
  if (axiosError && typeof axiosError === 'object') {
    const status = axiosError.status || axiosError.statusCode || axiosError.code;

    // 503, 504, timeout
    if (status === 503 || status === 504 || status === 'ECONNABORTED' || status === 'ETIMEDOUT') {
      return true;
    }

    // 5xx range
    if (typeof status === 'number' && status >= 500 && status < 600) {
      return true;
    }
  }

  return false;
}

function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.initialDelay * Math.pow(2, attempt - 1);
  // Add jitter: ±10% of delay
  const jitter = exponentialDelay * (0.1 * (Math.random() - 0.5));
  const delay = Math.min(exponentialDelay + jitter, options.maxDelay);
  return Math.max(0, delay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  userOptions: RetryOptions = {}
): Promise<T> {
  const options: Required<RetryOptions> = {
    ...DEFAULT_OPTIONS,
    ...userOptions,
  };

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isTransient = isTransientError(error);

      if (!isTransient) {
        logger.warn('Non-transient error, not retrying', {
          error: lastError.message,
          attempt,
          maxAttempts: options.maxAttempts,
        });
        throw error;
      }

      if (attempt < options.maxAttempts) {
        const delay = calculateDelay(attempt, options);
        logger.info('Retrying after transient error', {
          error: lastError.message,
          attempt,
          maxAttempts: options.maxAttempts,
          delayMs: Math.round(delay),
        });
        await sleep(delay);
      }
    }
  }

  if (lastError) {
    logger.error('Max retry attempts exceeded', {
      error: lastError.message,
      maxAttempts: options.maxAttempts,
    });
    throw lastError;
  }

  throw new Error('Unexpected error in retry logic');
}
