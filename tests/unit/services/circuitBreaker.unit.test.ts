import { describe, it, expect, beforeEach } from 'bun:test';
import { CircuitBreaker } from '../../../src/services/circuitBreaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker<string>;

  beforeEach(() => {
    cb = new CircuitBreaker('test-cb', {
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 100,
    });
  });

  describe('Initial state', () => {
    it('should start in closed state', () => {
      expect(cb.getState()).toBe('closed');
    });

    it('should provide status information', () => {
      const status = cb.getStatus();
      expect(status.state).toBe('closed');
      expect(status.failureCount).toBe(0);
      expect(status.successCount).toBe(0);
    });
  });

  describe('Closed state behavior', () => {
    it('should execute function in closed state', async () => {
      let called = false;
      const fn = async () => {
        called = true;
        return 'success';
      };

      const result = await cb.execute(fn);

      expect(called).toBe(true);
      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
    });

    it('should reset failure count on successful execution', async () => {
      const fn = async () => 'success';

      await cb.execute(fn);

      expect(cb.getStatus().failureCount).toBe(0);
    });
  });

  describe('Open state transition', () => {
    it('should transition to open after threshold failures', async () => {
      const fn = async () => {
        throw new Error('failure');
      };

      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(cb.getState()).toBe('open');
    });

    it('should return fallback value when open', async () => {
      // Make circuit open
      const failFn = async () => {
        throw new Error('failure');
      };
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      const fallback = async () => 'fallback';
      const result = await cb.execute(failFn, fallback);

      expect(result).toBe('fallback');
    });

    it('should throw when open with no fallback', async () => {
      const failFn = async () => {
        throw new Error('failure');
      };
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      try {
        await cb.execute(failFn);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('Circuit breaker');
      }
    });
  });

  describe('Half-open state', () => {
    it('should transition to half-open after reset timeout', async () => {
      const failFn = async () => {
        throw new Error('failure');
      };

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      expect(cb.getState()).toBe('open');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Next call should transition to half-open
      const successFn = async () => 'success';
      await cb.execute(successFn);

      // Should still be attempting (in half-open or closed state)
      expect(['half-open', 'closed']).toContain(cb.getState());
    });

    it('should return to open on failure in half-open', async () => {
      const failFn = async () => {
        throw new Error('failure');
      };

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Attempt in half-open state should fail
      try {
        await cb.execute(failFn);
      } catch {
        // Expected
      }

      expect(cb.getState()).toBe('open');
    });
  });

  describe('Closed state recovery', () => {
    it('should transition from half-open to closed after successes', async () => {
      const failFn = async () => {
        throw new Error('failure');
      };

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Succeed enough times to close
      const successFn = async () => 'success';
      await cb.execute(successFn);
      await cb.execute(successFn);

      expect(cb.getState()).toBe('closed');
    });
  });

  describe('Manual reset', () => {
    it('should reset circuit to closed', async () => {
      const failFn = async () => {
        throw new Error('failure');
      };

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      expect(cb.getState()).toBe('open');

      // Reset
      cb.reset();

      expect(cb.getState()).toBe('closed');
      expect(cb.getStatus().failureCount).toBe(0);
    });

    it('should not reset if already closed', () => {
      expect(cb.getState()).toBe('closed');
      cb.reset();
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('Fallback function behavior', () => {
    it('should accept sync fallback', async () => {
      const failFn = async () => {
        throw new Error('failure');
      };

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      const syncFallback = () => 'sync-fallback';
      const result = await cb.execute(failFn, syncFallback);

      expect(result).toBe('sync-fallback');
    });

    it('should accept async fallback', async () => {
      const failFn = async () => {
        throw new Error('failure');
      };

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(failFn);
        } catch {
          // Expected
        }
      }

      const asyncFallback = async () => 'async-fallback';
      const result = await cb.execute(failFn, asyncFallback);

      expect(result).toBe('async-fallback');
    });
  });

  describe('Custom configuration', () => {
    it('should use custom failure threshold', async () => {
      const customCb = new CircuitBreaker('custom', {
        failureThreshold: 5,
      });

      const failFn = async () => {
        throw new Error('failure');
      };

      // Should not open until 5 failures
      for (let i = 0; i < 4; i++) {
        try {
          await customCb.execute(failFn);
        } catch {
          // Expected
        }
      }

      expect(customCb.getState()).toBe('closed');

      try {
        await customCb.execute(failFn);
      } catch {
        // Expected
      }

      expect(customCb.getState()).toBe('open');
    });
  });
});
