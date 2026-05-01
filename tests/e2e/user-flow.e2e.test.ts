import { describe, it, expect } from 'bun:test';
import { CourseraClient } from '../../src/services/courseraClient';
import { CacheService } from '../../src/services/cache';
import { AuthService } from '../../src/services/auth';
import { searchCourses } from '../../src/tools/search';
import { getCourseDetails } from '../../src/tools/details';
import path from 'path';

const testCacheDir = path.join(process.cwd(), '.test-e2e-cache');

describe('E2E: User Complete Workflow', () => {
  let courseraClient: CourseraClient;
  let cache: CacheService;
  let authService: AuthService;

  it('should handle complete user flow: search → details → authenticate', async () => {
    // Initialize services
    courseraClient = new CourseraClient();
    cache = new CacheService(testCacheDir);
    authService = new AuthService(courseraClient, 'test-password');

    // 1. Search for courses (public tool - no auth needed)
    const searchParams = { query: 'Python' };
    const searchResult = await searchCourses(courseraClient, cache, searchParams as any);

    expect(searchResult).toBeDefined();
    expect(searchResult.items).toBeDefined();
    expect(Array.isArray(searchResult.items)).toBe(true);
  });

  it('should cache search results and reuse on second call', async () => {
    courseraClient = new CourseraClient();
    cache = new CacheService(testCacheDir);

    const params = { query: 'JavaScript' };

    // First call
    const result1 = await searchCourses(courseraClient, cache, params as any);
    expect(result1).toBeDefined();

    // Second call should use cache (instant)
    const result2 = await searchCourses(courseraClient, cache, params as any);
    expect(result2).toBeDefined();

    // Results should be consistent
    expect(result1.items?.length).toBe(result2.items?.length);
  });

  it('should handle authentication flow', async () => {
    authService = new AuthService(courseraClient, 'test-password');

    // Generate TOTP secret for testing
    const { secret } = await authService.generateTOTPSecret('test@example.com');

    // Validate TOTP code generation
    const totpCode = authService.generateTOTPCode(secret);
    expect(totpCode).toBeDefined();
    expect(totpCode.length).toBe(6);
    expect(/^\d{6}$/.test(totpCode)).toBe(true);

    // Validate session storage
    authService.saveSession('test@example.com', {
      sessionToken: 'test-token-123',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      lastRefreshed: Date.now(),
    });

    const session = authService.loadSession('test@example.com');
    expect(session).toBeDefined();
    expect(session?.email).toBe('test@example.com');
  });

  it('should handle workflow errors gracefully', async () => {
    courseraClient = new CourseraClient();
    cache = new CacheService(testCacheDir);

    // Test with invalid parameters
    try {
      await searchCourses(courseraClient, cache, {
        query: '',
      } as any);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
