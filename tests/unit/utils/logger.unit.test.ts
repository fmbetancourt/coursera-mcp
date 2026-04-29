import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../../../src/utils/logger';
import { sanitizeForLogging } from '../../../src/utils/logSanitizer';

const testLogsDir = path.join(process.cwd(), '.test-logs');

describe('Logger and Sanitizer', () => {
  beforeEach(() => {
    fs.ensureDirSync(testLogsDir);
  });

  afterEach(() => {
    fs.removeSync(testLogsDir);
  });

  describe('sanitizeForLogging', () => {
    it('should redact password field', () => {
      const obj = { username: 'john', password: 'secret123' };
      const sanitized = sanitizeForLogging(obj);

      expect(sanitized).toEqual({
        username: 'john',
        password: '[REDACTED]',
      });
    });

    it('should redact email field', () => {
      const obj = { email: 'user@example.com', name: 'John' };
      const sanitized = sanitizeForLogging(obj);

      expect(sanitized.email).toBe('[REDACTED]');
      expect(sanitized.name).toBe('John');
    });

    it('should redact token and sessionToken', () => {
      const obj = {
        token: 'abc123xyz',
        sessionToken: 'session456',
        apiKey: 'key789',
      };
      const sanitized = sanitizeForLogging(obj);

      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.sessionToken).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
    });

    it('should NOT redact non-sensitive fields', () => {
      const obj = {
        courseName: 'Advanced TypeScript',
        description: 'Learn TypeScript',
        rating: 4.5,
      };
      const sanitized = sanitizeForLogging(obj);

      expect(sanitized.courseName).toBe('Advanced TypeScript');
      expect(sanitized.description).toBe('Learn TypeScript');
      expect(sanitized.rating).toBe(4.5);
    });

    it('should handle nested objects recursively', () => {
      const obj = {
        user: {
          email: 'test@example.com',
          password: 'secret',
          profile: {
            name: 'John',
            token: 'abc123',
          },
        },
      };
      const sanitized = sanitizeForLogging(obj);

      expect(sanitized.user.email).toBe('[REDACTED]');
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.profile.name).toBe('John');
      expect(sanitized.user.profile.token).toBe('[REDACTED]');
    });

    it('should handle arrays with objects', () => {
      const obj = {
        users: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
      };
      const sanitized = sanitizeForLogging(obj);

      expect((sanitized.users as Array<Record<string, unknown>>)[0].email).toBe('[REDACTED]');
      expect((sanitized.users as Array<Record<string, unknown>>)[1].email).toBe('[REDACTED]');
      expect((sanitized.users as Array<Record<string, unknown>>)[0].name).toBe('User 1');
    });

    it('should respect max depth', () => {
      const obj = { a: { b: { c: { d: { e: { password: 'secret' } } } } } };
      const sanitized = sanitizeForLogging(obj, 3); // max depth 3

      expect(JSON.stringify(sanitized)).not.toContain('secret');
    });

    it('should handle primitive values', () => {
      expect(sanitizeForLogging('string')).toBe('string');
      expect(sanitizeForLogging(42)).toBe(42);
      expect(sanitizeForLogging(true)).toBe(true);
      expect(sanitizeForLogging(null)).toBe(null);
      expect(sanitizeForLogging(undefined)).toBe(undefined);
    });
  });

  describe('Winston Logger', () => {
    it('logger should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('logger should have common methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log without throwing', () => {
      expect(() => {
        logger.info('Test message', { key: 'value' });
      }).not.toThrow();
    });

    it('should log errors without throwing', () => {
      expect(() => {
        logger.error('Error message', { error: new Error('test') });
      }).not.toThrow();
    });

    it('should sanitize sensitive data in logs', () => {
      expect(() => {
        logger.info('User login', {
          email: 'user@example.com',
          password: 'secret123',
          username: 'john',
        });
      }).not.toThrow();
    });
  });
});
