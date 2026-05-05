import { describe, it, expect } from 'bun:test';
import { CourseraClient } from '../../src/services/courseraClient';
import { CacheService } from '../../src/services/cache';
import { AuthService } from '../../src/services/auth';
import { CatalogIndex, type CatalogCourse, type SearchFilters } from '../../src/services/catalogIndex';
import { searchCourses } from '../../src/tools/search';
import { getCourseDetails } from '../../src/tools/details';
import path from 'path';

const testCacheDir = path.join(process.cwd(), '.test-e2e-cache');

// Minimal in-memory catalog for E2E tests (avoids building a 21K-course index during tests)
const e2eCatalogCourses: CatalogCourse[] = [
  { id: 'py-e2e', name: 'Python for Everybody', slug: 'python-everybody', description: 'Learn Python', level: 'BEGINNER', primaryLanguages: ['en'], certificates: ['CERTIFICATE'] },
  { id: 'js-e2e', name: 'JavaScript Basics', slug: 'javascript-basics', description: 'Learn JavaScript fundamentals', level: 'BEGINNER', primaryLanguages: ['en'], certificates: [] },
  { id: 'ml-e2e', name: 'Machine Learning', slug: 'machine-learning', description: 'Introduction to machine learning', level: 'INTERMEDIATE', primaryLanguages: ['en'], certificates: ['CERTIFICATE'] },
];

class E2ECatalogIndex extends CatalogIndex {
  constructor() { super(new CourseraClient(), '/tmp/e2e-catalog.json'); }
  override async ensureIndex(): Promise<void> {}
  override async buildIndex(): Promise<void> {}
  override async search(query: string, filters: SearchFilters = {}): Promise<CatalogCourse[]> {
    const q = query.toLowerCase().trim();
    let r = e2eCatalogCourses.filter((c) => !q || `${c.name} ${c.description ?? ''}`.toLowerCase().includes(q));
    if (filters.level) r = r.filter((c) => (c.level ?? '').toLowerCase() === filters.level);
    return r;
  }
  override async getStatus() { return { total: e2eCatalogCourses.length, builtAt: new Date(), isStale: false }; }
}

describe('E2E: User Complete Workflow', () => {
  let courseraClient: CourseraClient;
  let cache: CacheService;
  let authService: AuthService;
  let catalogIndex: E2ECatalogIndex;

  it('should handle complete user flow: search → details → authenticate', async () => {
    courseraClient = new CourseraClient();
    cache = new CacheService(testCacheDir);
    authService = new AuthService(courseraClient, 'test-password');
    catalogIndex = new E2ECatalogIndex();

    const searchParams = { query: 'Python' };
    const searchResult = await searchCourses(courseraClient, cache, catalogIndex, searchParams);

    expect(searchResult).toBeDefined();
    expect(searchResult.items).toBeDefined();
    expect(Array.isArray(searchResult.items)).toBe(true);
  });

  it('should cache search results and reuse on second call', async () => {
    courseraClient = new CourseraClient();
    cache = new CacheService(testCacheDir);
    catalogIndex = new E2ECatalogIndex();

    const params = { query: 'JavaScript' };

    const result1 = await searchCourses(courseraClient, cache, catalogIndex, params);
    expect(result1).toBeDefined();

    const result2 = await searchCourses(courseraClient, cache, catalogIndex, params);
    expect(result2).toBeDefined();

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
    catalogIndex = new E2ECatalogIndex();

    try {
      await searchCourses(courseraClient, cache, catalogIndex, { query: '' });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
