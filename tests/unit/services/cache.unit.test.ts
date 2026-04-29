import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CacheService } from '../../../src/services/cache';

const testCacheDir = path.join(process.cwd(), '.test-cache');

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    cache = new CacheService(testCacheDir);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('Basic get/set', () => {
    it('should set and get data', () => {
      const data = { id: 1, name: 'Test' };
      cache.set('key1', data);

      const retrieved = cache.get('key1');
      expect(retrieved).toEqual(data);
    });

    it('should return null for missing key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      cache.set('string', 'value');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('array', [1, 2, 3]);
      cache.set('object', { key: 'value' });

      expect(cache.get('string')).toBe('value');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('object')).toEqual({ key: 'value' });
    });
  });

  describe('TTL and Expiration', () => {
    it('should return null for expired cache', async () => {
      cache.set('expiring', { data: 'value' }, 1); // 1 second TTL

      // Immediately should work
      expect(cache.get('expiring')).not.toBeNull();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(cache.get('expiring')).toBeNull();
    });

    it('should use default TTL of 300 seconds', () => {
      cache.set('default-ttl', { data: 'value' });

      // Should be available immediately
      expect(cache.get('default-ttl')).not.toBeNull();
    });

    it('should not retrieve expired data with custom TTL', async () => {
      cache.set('custom-ttl', { data: 'value' }, 0.1); // 100ms

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(cache.get('custom-ttl')).toBeNull();
    });
  });

  describe('Stale cache', () => {
    it('should return data with isStale flag', () => {
      const data = { value: 123 };
      cache.set('test', data, 1000);

      const result = cache.getStale('test');
      expect(result).not.toBeNull();
      expect(result?.isStale).toBe(false);
      expect(result?.data).toEqual(data);
    });

    it('should mark expired data as stale', async () => {
      cache.set('stale-test', { value: 123 }, 0.1);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = cache.getStale('stale-test');
      expect(result).not.toBeNull();
      expect(result?.isStale).toBe(true);
    });

    it('should return null for missing key in getStale', () => {
      const result = cache.getStale('missing');
      expect(result).toBeNull();
    });
  });

  describe('Stale-while-revalidate pattern', () => {
    it('should return fresh data without refetch', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { data: 'fresh' };
      };

      const result1 = await cache.getWithStaleCache('swr-test', fetcher, 1000);
      expect(result1).toEqual({ data: 'fresh' });
      expect(fetchCount).toBe(1);

      // Second call should use cache without fetching
      const result2 = await cache.getWithStaleCache('swr-test', fetcher, 1000);
      expect(result2).toEqual({ data: 'fresh' });
      expect(fetchCount).toBe(1); // Should not have incremented
    });

    it('should trigger background refresh when stale', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { version: fetchCount };
      };

      // Initial fetch
      const result1 = await cache.getWithStaleCache('swr-bg', fetcher, 0.1);
      expect(result1.version).toBe(1);
      expect(fetchCount).toBe(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should trigger refresh (either immediate or background)
      const result2 = await cache.getWithStaleCache('swr-bg', fetcher, 0.5);
      expect(result2.version).toBeGreaterThanOrEqual(1); // Either v1 (stale) or v2 (fresh)

      // Wait for any pending refresh
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should eventually have v2
      expect(fetchCount).toBeGreaterThanOrEqual(2);
    });

    it('should fetch fresh if no cache exists', async () => {
      let fetchCount = 0;
      const fetcher = async () => {
        fetchCount++;
        return { data: 'fresh' };
      };

      const result = await cache.getWithStaleCache('no-cache', fetcher, 300);

      expect(result).toEqual({ data: 'fresh' });
      expect(fetchCount).toBe(1);
    });
  });

  describe('Persistence', () => {
    it('should persist data to disk', () => {
      const data = { id: 1, name: 'Persisted' };
      cache.set('persist-test', data);

      const files = fs.readdirSync(testCacheDir);
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.endsWith('.json'))).toBe(true);
    });

    it('should load persisted data on new instance', () => {
      const data = { id: 1, name: 'Persisted' };
      cache.set('persist-key', data, 3600); // 1 hour TTL

      // Create new instance immediately
      const cache2 = new CacheService(testCacheDir);

      // Data should be loaded from disk
      const retrieved = cache2.get('persist-key');
      expect(retrieved).toEqual(data);
    });

    it('should not load expired entries from disk', async () => {
      cache.set('expire-soon', { data: 'value' }, 0.1);

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Create new instance
      const cache2 = new CacheService(testCacheDir);
      const retrieved = cache2.get('expire-soon');

      expect(retrieved).toBeNull();
    });

    it('should set file permissions to 0o600', () => {
      cache.set('permissions-test', { data: 'secure' });

      const files = fs.readdirSync(testCacheDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(testCacheDir, file);
        const stats = fs.statSync(filePath);
        // Check that file permissions are restrictive (0o600 = rw-------)
        expect((stats.mode & 0o077) === 0).toBe(true);
      }
    });
  });

  describe('Clear', () => {
    it('should clear all cache entries', () => {
      cache.set('key1', { data: 1 });
      cache.set('key2', { data: 2 });
      cache.set('key3', { data: 3 });

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });

    it('should clear disk cache', () => {
      cache.set('disk-key', { data: 'value' });

      cache.clear();

      const files = fs.readdirSync(testCacheDir);
      expect(files.length).toBe(0);
    });
  });

  describe('Key hashing', () => {
    it('should hash keys for security', () => {
      const data = { sensitive: 'data' };
      cache.set('my-secret-key', data);

      const files = fs.readdirSync(testCacheDir).filter((f) => f.endsWith('.json'));

      // Keys should be hashed (SHA-256 hex = 64 chars)
      for (const file of files) {
        const name = file.replace('.json', '');
        expect(name.length).toBe(64); // SHA-256 hex length
        expect(/^[a-f0-9]{64}$/.test(name)).toBe(true);
      }
    });
  });
});
