import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CourseraClient } from '../../../src/services/courseraClient';
import { CacheService } from '../../../src/services/cache';
import { CatalogIndex, type CatalogCourse, type SearchFilters } from '../../../src/services/catalogIndex';
import { searchCourses, searchPrograms } from '../../../src/tools/search';

const testCacheDir = path.join(process.cwd(), '.test-search-cache');

class MockCourseraClient extends CourseraClient {
  private mockResponses: Map<string, unknown> = new Map();

  setMockResponse(key: string, response: unknown): void {
    this.mockResponses.set(key, response);
  }

  async get<T>(url: string): Promise<T> {
    for (const [key, val] of this.mockResponses.entries()) {
      if (url.startsWith(key) || url === key) return val as T;
    }
    throw new Error(`No mock response for ${url}`);
  }
}

// CatalogIndex mock that doesn't make HTTP calls
class MockCatalogIndex extends CatalogIndex {
  private fixedCourses: CatalogCourse[];

  constructor(courses: CatalogCourse[]) {
    super(new CourseraClient(), '/tmp/mock-catalog-search-index.json');
    this.fixedCourses = courses;
  }

  override async ensureIndex(): Promise<void> {}
  override async buildIndex(): Promise<void> {}

  override async search(query: string, filters: SearchFilters = {}): Promise<CatalogCourse[]> {
    const q = query.toLowerCase().trim();
    let results = this.fixedCourses.filter((c) => {
      if (!q) return true;
      const haystack = `${c.name} ${c.description ?? ''} ${c.slug}`.toLowerCase();
      return haystack.includes(q);
    });
    if (filters.level) {
      results = results.filter((c) => (c.level ?? '').toLowerCase() === filters.level);
    }
    if (filters.language) {
      results = results.filter((c) => c.primaryLanguages?.includes(filters.language!));
    }
    return results;
  }

  override async getStatus() {
    return { total: this.fixedCourses.length, builtAt: new Date(), isStale: false };
  }
}

const mockCatalogCourses: CatalogCourse[] = [
  {
    id: 'py-001',
    name: 'Python for Beginners',
    slug: 'python-beginners',
    description: 'Learn Python programming from scratch',
    level: 'BEGINNER',
    primaryLanguages: ['en'],
    certificates: ['CERTIFICATE'],
    workload: '4 weeks of study',
    domainTypes: [{ domainId: 'cs', subdomainId: 'programming' }],
  },
  {
    id: 'ml-002',
    name: 'Machine Learning',
    slug: 'machine-learning',
    description: 'Introduction to ML algorithms',
    level: 'INTERMEDIATE',
    primaryLanguages: ['en'],
    certificates: [],
    workload: '8 weeks of study',
    domainTypes: [{ domainId: 'cs', subdomainId: 'ml' }],
  },
  {
    id: 'js-003',
    name: 'JavaScript Avanzado',
    slug: 'javascript-avanzado',
    description: 'Curso de JavaScript avanzado',
    level: 'ADVANCED',
    primaryLanguages: ['es'],
    certificates: ['CERTIFICATE'],
    workload: '6 weeks',
    domainTypes: [{ domainId: 'cs', subdomainId: 'webdev' }],
  },
  {
    id: 'ds-004',
    name: 'Data Science Foundations',
    slug: 'data-science',
    description: 'Learn Python for data science',
    level: 'BEGINNER',
    primaryLanguages: ['en'],
    certificates: ['CERTIFICATE'],
    workload: '6 weeks of study',
    domainTypes: [{ domainId: 'cs', subdomainId: 'data-science' }],
  },
];

describe('Search Tools Integration', () => {
  let courseraClient: MockCourseraClient;
  let catalogIndex: MockCatalogIndex;
  let cache: CacheService;

  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    courseraClient = new MockCourseraClient();
    catalogIndex = new MockCatalogIndex(mockCatalogCourses);
    cache = new CacheService(testCacheDir);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('searchCourses', () => {
    it('should return courses matching query from catalog index', async () => {
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: 'Python',
      });

      // Both 'Python for Beginners' and 'Data Science Foundations' contain 'python' in description
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.query).toBe('Python');
      expect(result.items[0].courseUrl).toContain('coursera.org/learn/');
    });

    it('should report catalogSize in results', async () => {
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: 'python',
      });

      expect(result.catalogSize).toBe(mockCatalogCourses.length);
    });

    it('should cache results on second request', async () => {
      const result1 = await searchCourses(courseraClient, cache, catalogIndex, {
        query: 'JavaScript',
      });
      const result2 = await searchCourses(courseraClient, cache, catalogIndex, {
        query: 'JavaScript',
      });

      expect(result1.items.length).toBe(result2.items.length);
    });

    it('should filter by level beginner', async () => {
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: '',
        level: 'beginner',
      });

      // py-001 and ds-004 are BEGINNER
      expect(result.items.length).toBe(2);
      result.items.forEach((item) => {
        expect(item.level).toBe('beginner');
      });
    });

    it('should filter by language', async () => {
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: '',
        language: 'es',
      });

      // Only js-003 is Spanish
      expect(result.items.length).toBe(1);
      expect(result.items[0].language).toBe('es');
    });

    it('should respect limit parameter', async () => {
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: '',
        limit: 2,
      });

      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    it('should set hasMore true when filtered results exceed limit', async () => {
      // All 4 courses match empty query; limit 2 → hasMore true
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: '',
        limit: 2,
      });

      expect(result.total).toBe(mockCatalogCourses.length);
      expect(result.hasMore).toBe(true);
    });

    it('should return empty results for non-matching query', async () => {
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: 'Quantum Physics Thermodynamics XYZ',
      });

      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should map course data correctly', async () => {
      const result = await searchCourses(courseraClient, cache, catalogIndex, {
        query: 'Python for Beginners',
      });

      const course = result.items.find((c) => c.slug === 'python-beginners');
      expect(course).toBeDefined();
      expect(course?.name).toBe('Python for Beginners');
      expect(course?.certificate).toBe(true);
      expect(course?.duration).toBeGreaterThan(0);
    });
  });

  describe('searchPrograms', () => {
    it('should search specializations from Coursera API', async () => {
      const mockSpecResponse = {
        elements: [
          {
            id: 'spec-001',
            name: 'Data Science Specialization',
            slug: 'data-science-spec',
            description: 'Complete data science program',
            tagline: 'Become a data scientist',
            courseIds: ['c1', 'c2', 'c3'],
          },
          {
            id: 'spec-002',
            name: 'Machine Learning Specialization',
            slug: 'ml-spec',
            description: 'Learn ML from scratch',
            courseIds: ['c4', 'c5'],
          },
        ],
        paging: { total: 2 },
      };

      // searchPrograms fetches 3 pages; mock the base URL prefix
      courseraClient.setMockResponse('/api/onDemandSpecializations.v1', mockSpecResponse);

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Data Science',
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.query).toBe('Data Science');
      expect(result.items[0].programUrl).toContain('coursera.org/specializations/');
    });

    it('should cache program results', async () => {
      const mockResponse = {
        elements: [
          { id: 's1', name: 'AI Specialization', slug: 'ai-spec', description: 'AI program', courseIds: ['c1'] },
        ],
        paging: { total: 1 },
      };

      courseraClient.setMockResponse('/api/onDemandSpecializations.v1', mockResponse);

      const r1 = await searchPrograms(courseraClient, cache, { query: 'AI' });
      const r2 = await searchPrograms(courseraClient, cache, { query: 'AI' });

      expect(r1.items.length).toBe(r2.items.length);
    });

    it('should return empty results for non-matching program query', async () => {
      courseraClient.setMockResponse('/api/onDemandSpecializations.v1', {
        elements: [
          { id: 's1', name: 'Biology Program', slug: 'biology', description: 'Study biology', courseIds: [] },
        ],
        paging: { total: 1 },
      });

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Quantum Physics Thermodynamics XYZ',
      });

      expect(result.items.length).toBe(0);
    });

    it('should respect limit for programs', async () => {
      const manySpecs = Array.from({ length: 10 }, (_, i) => ({
        id: `s${i}`,
        name: `Python Specialization ${i}`,
        slug: `python-spec-${i}`,
        description: 'Python program',
        courseIds: ['c1'],
      }));

      courseraClient.setMockResponse('/api/onDemandSpecializations.v1', {
        elements: manySpecs,
        paging: { total: 10 },
      });

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Python',
        limit: 3,
      });

      expect(result.items.length).toBeLessThanOrEqual(3);
    });
  });
});
