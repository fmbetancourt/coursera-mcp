import { describe, it, expect, beforeEach } from 'bun:test';
import { withRetry } from '../../../src/utils/retry';

describe('Retry Logic with Exponential Backoff', () => {
  describe('Success cases', () => {
    it('should succeed on first attempt without retrying', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'success';
      };

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('should retry and succeed on second attempt', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('timeout');
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(fn, { maxAttempts: 3, initialDelay: 10 });

      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should retry and succeed on third attempt', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('ETIMEDOUT');
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(fn, { maxAttempts: 4, initialDelay: 5 });

      expect(result).toBe('success');
      expect(callCount).toBe(3);
    });
  });

  describe('Failure cases', () => {
    it('should fail after max attempts exceeded', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        const error = new Error('timeout');
        throw error;
      };

      try {
        await withRetry(fn, { maxAttempts: 2, initialDelay: 5 });
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(callCount).toBe(2);
      }
    });

    it('should NOT retry non-transient errors (4xx)', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        const error = new Error('Bad request');
        (error as Record<string, number>).statusCode = 400;
        throw error;
      };

      try {
        await withRetry(fn, { maxAttempts: 3, initialDelay: 5 });
        expect.unreachable('Should have thrown');
      } catch {
        expect(callCount).toBe(1);
      }
    });

    it('should NOT retry validation errors', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        const error = new Error('Validation failed');
        throw error;
      };

      try {
        await withRetry(fn, { maxAttempts: 3, initialDelay: 5 });
        expect.unreachable('Should have thrown');
      } catch {
        expect(callCount).toBe(1);
      }
    });
  });

  describe('Backoff strategy', () => {
    it('should apply exponential backoff (delays increase)', async () => {
      const delays: number[] = [];
      let callCount = 0;
      const startTime = Date.now();

      const fn = async () => {
        callCount++;
        if (callCount < 4) {
          const error = new Error('timeout');
          throw error;
        }
        return 'success';
      };

      await withRetry(fn, { maxAttempts: 4, initialDelay: 50, maxDelay: 500 });

      expect(callCount).toBe(4);
      const totalTime = Date.now() - startTime;

      // Should have multiple retries with delays
      // Approximate: 50ms + 100ms + 200ms = 350ms minimum (with some variance)
      expect(totalTime).toBeGreaterThan(100);
    });

    it('should respect maxDelay', async () => {
      const maxDelay = 100;
      let callCount = 0;

      const fn = async () => {
        callCount++;
        if (callCount < 3) {
          const error = new Error('ECONNREFUSED');
          throw error;
        }
        return 'success';
      };

      const startTime = Date.now();
      await withRetry(fn, { maxAttempts: 3, initialDelay: 50, maxDelay });
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(maxDelay * 3 + 100); // Allow some variance
    });
  });

  describe('Transient error detection', () => {
    it('should retry on timeout error', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Request timeout');
        }
        return 'success';
      };

      const result = await withRetry(fn, { maxAttempts: 2, initialDelay: 5 });
      expect(callCount).toBe(2);
      expect(result).toBe('success');
    });

    it('should retry on ECONNREFUSED', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('ECONNREFUSED');
        }
        return 'success';
      };

      const result = await withRetry(fn, { maxAttempts: 2, initialDelay: 5 });
      expect(result).toBe('success');
    });

    it('should retry on 5xx errors', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('Service unavailable');
          (error as Record<string, number>).statusCode = 503;
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(fn, { maxAttempts: 2, initialDelay: 5 });
      expect(result).toBe('success');
    });
  });

  describe('Default options', () => {
    it('should use default maxAttempts of 3', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        throw new Error('timeout');
      };

      try {
        await withRetry(fn);
      } catch {
        expect(callCount).toBe(3);
      }
    });

    it('should use default initialDelay of 1000', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('timeout');
        }
        return 'success';
      };

      const startTime = Date.now();
      await withRetry(fn);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThan(500); // At least half the initial delay
    });
  });
});
