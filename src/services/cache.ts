import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  key?: string;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private cacheDir: string;

  constructor(cacheDir = path.join(process.env.HOME || '~', '.coursera-mcp', 'cache')) {
    this.cacheDir = cacheDir;
    fs.ensureDirSync(this.cacheDir);
    this.loadFromDisk();
  }

  private getHashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${this.getHashKey(key)}.json`);
  }

  set<T>(key: string, data: T, ttlSeconds = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;

    const entry: CacheEntry<T> = {
      data,
      expiresAt,
      createdAt: Date.now(),
      key,
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Persist to disk
    try {
      const filePath = this.getCacheFilePath(key);
      fs.writeJsonSync(filePath, entry, { mode: 0o600 });
      logger.debug('Cache write', { key, ttlSeconds });
    } catch (error) {
      logger.warn('Failed to write cache to disk', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      this.removeDiskEntry(key);
      return null;
    }

    return entry.data;
  }

  getStale<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const isStale = Date.now() > entry.expiresAt;
    return { data: entry.data, isStale };
  }

  async getWithStaleCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    // Try fresh cache first
    const fresh = this.get<T>(key);
    if (fresh) {
      return fresh;
    }

    // Try stale cache (will be revalidated in background)
    const stale = this.getStale<T>(key);
    if (stale) {
      // Return stale data immediately, refresh in background
      void this.refreshInBackground(key, fetcher, ttlSeconds);
      return stale.data;
    }

    // No cache, fetch fresh
    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
  ): Promise<void> {
    try {
      const data = await fetcher();
      this.set(key, data, ttlSeconds);
      logger.debug('Background cache refresh completed', { key });
    } catch (error) {
      logger.warn('Background cache refresh failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  clear(): void {
    // Clear memory
    this.memoryCache.clear();

    // Clear disk
    try {
      fs.emptyDirSync(this.cacheDir);
      logger.info('Cache cleared');
    } catch (error) {
      logger.warn('Failed to clear disk cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private removeDiskEntry(key: string): void {
    try {
      const filePath = this.getCacheFilePath(key);
      fs.removeSync(filePath);
    } catch (error) {
      logger.warn('Failed to remove cache entry from disk', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private loadFromDisk(): void {
    try {
      const files = fs.readdirSync(this.cacheDir);

      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        try {
          const filePath = path.join(this.cacheDir, file);
          const entry = fs.readJsonSync(filePath) as CacheEntry<unknown>;

          // Only load if not expired
          if (Date.now() <= entry.expiresAt) {
            // Use the stored key if available, otherwise use the filename
            const key = entry.key || file.replace('.json', '');
            this.memoryCache.set(key, entry);
          } else {
            fs.removeSync(filePath);
          }
        } catch (error) {
          logger.warn('Failed to load cache entry from disk', {
            file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('Cache loaded from disk', { entryCount: this.memoryCache.size });
    } catch (error) {
      logger.warn('Failed to load cache from disk', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
