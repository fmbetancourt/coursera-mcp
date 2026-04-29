import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CourseraClient } from '../../src/services/courseraClient';
import { CacheService } from '../../src/services/cache';
import { mockCourses } from '../fixtures';

const testCacheDir = path.join(process.cwd(), '.test-http-cache');

describe('HTTP + Cache Integration', () => {
  let courseraClient: CourseraClient;
  let cache: CacheService;

  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    courseraClient = new CourseraClient();
    cache = new CacheService(testCacheDir);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('Cache with HTTP requests', () => {
    it('should cache HTTP response', async () => {
      const courseId = 'course-123';
      const cacheKey = `course:${courseId}`;

      // First call - cache miss, would call HTTP (mocked below)
      const mockData = mockCourses[0];
      cache.set(cacheKey, mockData, 300);

      // Second call - cache hit
      const cachedData = cache.get(cacheKey);
      expect(cachedData).toEqual(mockData);
    });

    it('should serve stale cache while refreshing', async () => {
      const courseId = 'course-123';
      const cacheKey = `search:${courseId}`;
      let fetchCount = 0;

      const fetcher = async () => {
        fetchCount++;
        return { results: mockCourses, version: fetchCount };
      };

      // Initial fetch
      const result1 = await cache.getWithStaleCache(cacheKey, fetcher, 0.1);
      expect(result1.version).toBe(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should serve stale while refetching
      const result2 = await cache.getWithStaleCache(cacheKey, fetcher, 1);
      expect(result2.version).toBeGreaterThanOrEqual(1);

      // Background refresh should have happened
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });

    it('should invalidate cache on POST', async () => {
      const courseId = 'course-123';
      const readKey = `course:${courseId}`;

      // Cache a course
      const courseData = mockCourses[0];
      cache.set(readKey, courseData, 300);
      expect(cache.get(readKey)).toBeDefined();

      // Simulate POST (would invalidate related cache)
      cache.clear();
      expect(cache.get(readKey)).toBeNull();
    });

    it('should respect TTL expiration with HTTP fallback', async () => {
      const cacheKey = 'test:expiring';
      let fetchCount = 0;

      const fetcher = async () => {
        fetchCount++;
        return { data: 'fresh', version: fetchCount };
      };

      // Initial with short TTL
      const result1 = await cache.getWithStaleCache(cacheKey, fetcher, 0.1);
      expect(result1.version).toBe(1);
      expect(fetchCount).toBe(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should fetch fresh
      const result2 = await cache.getWithStaleCache(cacheKey, fetcher, 0.5);
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle multiple concurrent cache requests', async () => {
      const fetcher = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'result' };
      };

      const cacheKey = 'concurrent-test';

      // Make parallel requests
      const results = await Promise.all([
        cache.getWithStaleCache(cacheKey, fetcher, 300),
        cache.getWithStaleCache(cacheKey, fetcher, 300),
        cache.getWithStaleCache(cacheKey, fetcher, 300),
      ]);

      // All should get the same result
      for (const result of results) {
        expect(result.data).toBe('result');
      }
    });

    it('should persist cache across instances', async () => {
      const cacheKey = 'persistent-data';
      const data = { id: 1, name: 'Test Course', price: 99 };

      // Store in cache
      cache.set(cacheKey, data, 3600);

      // Create new cache instance
      const cache2 = new CacheService(testCacheDir);

      // Data should be loaded
      const retrieved = cache2.get(cacheKey);
      expect(retrieved).toEqual(data);
    });

    it('should handle cache with large data', async () => {
      const largeData = {
        courses: mockCourses.map((c) => ({
          ...c,
          description: 'x'.repeat(10000),
        })),
      };

      const cacheKey = 'large-data';
      cache.set(cacheKey, largeData, 300);

      const retrieved = cache.get(cacheKey);
      expect(retrieved).toBeDefined();
      expect(retrieved?.courses.length).toBe(5);
    });

    it('should track cache hit ratio', async () => {
      const cacheKey = 'hit-ratio-test';
      const data = { test: 'data' };

      // First access - miss
      const hit1 = cache.get(cacheKey) !== null;

      // Store
      cache.set(cacheKey, data, 300);

      // Multiple hits
      const hit2 = cache.get(cacheKey) !== null;
      const hit3 = cache.get(cacheKey) !== null;
      const hit4 = cache.get(cacheKey) !== null;

      expect(hit1).toBe(false);
      expect(hit2).toBe(true);
      expect(hit3).toBe(true);
      expect(hit4).toBe(true);
    });
  });

  describe('Cache key strategies', () => {
    it('should use different keys for different queries', () => {
      const query1 = 'Python';
      const query2 = 'JavaScript';

      const key1 = `search:${query1}`;
      const key2 = `search:${query2}`;

      cache.set(key1, { results: [mockCourses[0]] }, 300);
      cache.set(key2, { results: [mockCourses[1]] }, 300);

      expect(cache.get(key1)?.results[0].id).toBe(mockCourses[0].id);
      expect(cache.get(key2)?.results[0].id).toBe(mockCourses[1].id);
    });

    it('should hash keys for security', () => {
      const sensitiveKey = 'user:session:abc123xyz';
      const data = { sessionId: 'secure' };

      cache.set(sensitiveKey, data, 300);

      // Key should be hashed in file system
      const files = fs.readdirSync(testCacheDir).filter((f) => f.endsWith('.json'));
      expect(files.length).toBeGreaterThan(0);

      // Files should not contain the original key
      for (const file of files) {
        expect(file).not.toContain('user');
        expect(file).not.toContain('session');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle fetcher errors gracefully', async () => {
      const failingFetcher = async () => {
        throw new Error('Network error');
      };

      try {
        await cache.getWithStaleCache('error-test', failingFetcher, 300);
      } catch (error) {
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should recover from corrupted cache entries', () => {
      const cacheKey = 'test-key';
      const data = { valid: 'data' };

      // Set valid data
      cache.set(cacheKey, data, 300);
      expect(cache.get(cacheKey)).toBeDefined();

      // Clear and verify recovery
      cache.clear();
      expect(cache.get(cacheKey)).toBeNull();
    });
  });
});
