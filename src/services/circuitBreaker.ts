import { logger } from '../utils/logger';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  resetTimeout?: number; // milliseconds
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 60000,
};

export class CircuitBreaker<_T = void> {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly name: string;

  constructor(name: string, userOptions: CircuitBreakerOptions = {}) {
    this.name = name;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...userOptions,
    };
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStatus(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }

  async execute<R>(fn: () => Promise<R>, fallback?: () => Promise<R> | R): Promise<R> {
    // If circuit is open, check if we should transition to half-open
    if (this.state === 'open') {
      const now = Date.now();

      if (now < this.nextAttemptTime) {
        logger.warn('Circuit breaker is open, returning fallback', {
          circuit: this.name,
          resetInMs: this.nextAttemptTime - now,
        });

        if (fallback) {
          return Promise.resolve(fallback());
        }

        throw new Error(
          `Circuit breaker "${this.name}" is open. Reset in ${this.nextAttemptTime - now}ms`
        );
      }

      // Transition to half-open
      this.transitionTo('half-open');
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.successCount++;

        if (this.successCount >= this.options.successThreshold) {
          this.transitionTo('closed');
          this.failureCount = 0;
          this.successCount = 0;
        }
      } else if (this.state === 'closed') {
        this.failureCount = 0; // Reset on success
      }

      return result;
    } catch (error) {
      this.failureCount++;

      if (this.state === 'half-open') {
        // Any failure in half-open state returns to open
        this.transitionTo('open');
        this.successCount = 0;
        throw error;
      }

      if (this.state === 'closed' && this.failureCount >= this.options.failureThreshold) {
        this.transitionTo('open');
        this.successCount = 0;
      }

      throw error;
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const previousState = this.state;
    this.state = newState;

    logger.info('Circuit breaker state transition', {
      circuit: this.name,
      from: previousState,
      to: newState,
      failureCount: this.failureCount,
      successCount: this.successCount,
    });

    if (newState === 'open') {
      this.nextAttemptTime = Date.now() + this.options.resetTimeout;
    }
  }

  reset(): void {
    if (this.state !== 'closed') {
      this.state = 'closed';
      this.failureCount = 0;
      this.successCount = 0;
      this.nextAttemptTime = 0;

      logger.info('Circuit breaker reset', {
        circuit: this.name,
      });
    }
  }
}
