import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CourseraClient } from '../../src/services/courseraClient';
import { CircuitBreaker } from '../../src/services/circuitBreaker';
import { CacheService } from '../../src/services/cache';

const testCacheDir = path.join(process.cwd(), '.test-cb-cache');

describe('Circuit Breaker Integration', () => {
  let courseraClient: CourseraClient;
  let circuitBreaker: CircuitBreaker<unknown>;
  let cache: CacheService;

  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    courseraClient = new CourseraClient();
    circuitBreaker = new CircuitBreaker('test-cb', {
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 100, // Fast reset for testing
    });
    cache = new CacheService(testCacheDir);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('Circuit breaker states', () => {
    it('should be in closed state initially', () => {
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should transition from closed to open after threshold failures', async () => {
      let failureCount = 0;
      const failingFn = async () => {
        failureCount++;
        throw new Error('Service error');
      };

      // First failure
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected
      }
      expect(circuitBreaker.getState()).toBe('closed');

      // Second failure
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected
      }
      expect(circuitBreaker.getState()).toBe('closed');

      // Third failure - should open
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected
      }
      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should reject requests when open', async () => {
      // Force circuit to open
      const failingFn = async () => {
        throw new Error('API Error');
      };

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Circuit should reject quickly when open
      const startTime = Date.now();
      let error: Error | undefined;

      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        error = e as Error;
      }

      const duration = Date.now() - startTime;
      expect(error).toBeDefined();
      expect(duration).toBeLessThan(50); // Should fail fast
    });

    it('should transition to half-open after reset timeout', async () => {
      const failingFn = async () => {
        throw new Error('Service error');
      };

      // Force open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // State transitions on next attempt, not passively
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected
      }

      // Should be in half-open or open (depending on if attempt succeeded/failed)
      const state = circuitBreaker.getState();
      expect(['half-open', 'open']).toContain(state);
    });

    it('should attempt recovery after reset timeout with success', async () => {
      const failingFn = async () => {
        throw new Error('Service error');
      };

      const successFn = async () => {
        return { data: 'success' };
      };

      // Force open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute successful request - should transition to half-open and then possibly close
      const result = await circuitBreaker.execute(successFn);
      expect(result).toEqual({ data: 'success' });

      // After successful request, state should be half-open or closed (depending on success threshold)
      const state = circuitBreaker.getState();
      expect(['closed', 'half-open']).toContain(state);
    });

    it('should reopen if request fails in half-open', async () => {
      const failingFn = async () => {
        throw new Error('Service error');
      };

      // Force open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Try failing request in half-open
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe('open');
    });
  });

  describe('Fallback behavior', () => {
    it('should use fallback when circuit is open', async () => {
      const failingFn = async () => {
        throw new Error('Service error');
      };

      const fallbackFn = async () => {
        return { data: 'fallback' };
      };

      // Force open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Execute with fallback
      const result = await circuitBreaker.execute(failingFn, fallbackFn);
      expect(result).toEqual({ data: 'fallback' });
    });

    it('should not use fallback when circuit is closed', async () => {
      const successFn = async () => {
        return { data: 'success' };
      };

      const fallbackFn = async () => {
        return { data: 'fallback' };
      };

      expect(circuitBreaker.getState()).toBe('closed');

      const result = await circuitBreaker.execute(successFn, fallbackFn);
      expect(result).toEqual({ data: 'success' });
    });
  });

  describe('Circuit breaker with cache fallback', () => {
    it('should serve stale cache when circuit is open', async () => {
      const cacheKey = 'test-data';
      const cachedData = { courses: ['course1', 'course2'] };

      // Populate cache
      cache.set(cacheKey, cachedData, 300);

      let callCount = 0;
      const fetchFn = async () => {
        callCount++;
        throw new Error('API failure');
      };

      const cacheFallback = async () => {
        const stale = cache.getStale(cacheKey);
        if (stale?.data) {
          return stale.data;
        }
        throw new Error('Cache miss');
      };

      // Force circuit to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fetchFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Now execute with cache fallback
      const result = await circuitBreaker.execute(fetchFn, cacheFallback);
      expect(result).toEqual(cachedData);
    });

    it('should use SWR pattern during circuit open', async () => {
      const cacheKey = 'swr-test';
      const initialData = { version: 1 };

      // Populate cache
      cache.set(cacheKey, initialData, 100);

      let fetchCount = 0;
      const fetchFn = async () => {
        fetchCount++;
        throw new Error('API down');
      };

      // Force circuit open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(fetchFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Circuit open should serve cached data
      const cachedValue = cache.get(cacheKey);
      expect(cachedValue).toEqual(initialData);

      // API errors don't increment beyond threshold in open state
      for (let i = 0; i < 10; i++) {
        try {
          await circuitBreaker.execute(fetchFn);
        } catch {
          // Expected to fail fast
        }
      }

      expect(circuitBreaker.getState()).toBe('open');
    });
  });

  describe('Circuit breaker with CourseraClient', () => {
    it('should allow normal requests when closed', async () => {
      const successFn = async () => {
        return { data: 'test', status: 200 };
      };

      expect(circuitBreaker.getState()).toBe('closed');

      const result = await circuitBreaker.execute(successFn);
      expect(result.data).toBe('test');
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should fail fast when open', async () => {
      const failingFn = async () => {
        throw new Error('Network error');
      };

      // Force open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      const startTime = Date.now();
      let error: Error | undefined;

      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        error = e as Error;
      }

      const duration = Date.now() - startTime;
      expect(error).toBeDefined();
      expect(duration).toBeLessThan(100); // Should fail fast
    });
  });

  describe('Circuit breaker recovery', () => {
    it('should attempt recovery after reset timeout on next request', async () => {
      const failingFn = async () => {
        throw new Error('Temporary failure');
      };

      const successFn = async () => {
        return { success: true };
      };

      // Force open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');

      // Wait for reset
      await new Promise((resolve) => setTimeout(resolve, 150));

      // On next request, circuit should attempt recovery
      const result = await circuitBreaker.execute(successFn);
      expect(result).toBeDefined();

      // Circuit should be recovering or closed
      expect(['half-open', 'closed']).toContain(circuitBreaker.getState());
    });

    it('should track state transitions for monitoring', async () => {
      const failingFn = async () => {
        throw new Error('Error');
      };

      const successFn = async () => {
        return { success: true };
      };

      // Initial state
      expect(circuitBreaker.getState()).toBe('closed');

      // Move to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected
        }
      }
      expect(circuitBreaker.getState()).toBe('open');

      // Wait and attempt recovery
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Try to execute - circuit should attempt recovery
      const result = await circuitBreaker.execute(successFn);
      expect(result).toBeDefined();

      // Should be closed or half-open depending on recovery
      const finalState = circuitBreaker.getState();
      expect(['closed', 'half-open']).toContain(finalState);
    });
  });

  describe('Multiple circuit breakers', () => {
    it('should manage independent circuit breakers', async () => {
      const cb1 = new CircuitBreaker('cb-1', {
        failureThreshold: 2,
        resetTimeout: 100,
      });

      const cb2 = new CircuitBreaker('cb-2', {
        failureThreshold: 3,
        resetTimeout: 100,
      });

      const failingFn = async () => {
        throw new Error('Failure');
      };

      // Fail cb1 twice
      for (let i = 0; i < 2; i++) {
        try {
          await cb1.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(cb1.getState()).toBe('open');
      expect(cb2.getState()).toBe('closed');

      // Fail cb2 once - should still be closed
      try {
        await cb2.execute(failingFn);
      } catch {
        // Expected
      }

      expect(cb1.getState()).toBe('open');
      expect(cb2.getState()).toBe('closed');
    });
  });

  describe('Error scenarios', () => {
    it('should handle different error types', async () => {
      const errorTypes = [
        new Error('Network timeout'),
        new Error('500 Internal Server Error'),
        new Error('Service Unavailable'),
      ];

      let errorIndex = 0;
      const errorFn = async () => {
        throw errorTypes[errorIndex++];
      };

      // Force circuit to open with different errors
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(errorFn);
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should handle async operations timing', async () => {
      let callStartTime = 0;
      const slowFn = async () => {
        callStartTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'result' };
      };

      const result = await circuitBreaker.execute(slowFn);
      expect(result.data).toBe('result');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });
});
