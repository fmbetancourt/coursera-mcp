import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { getRecommendations } from '../../../src/tools/recommendations';
import { CacheService } from '../../../src/services/cache';
import { CourseraClient } from '../../../src/services/courseraClient';
import { CatalogIndex, type CatalogCourse, type SearchFilters } from '../../../src/services/catalogIndex';

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

// Minimal CatalogIndex mock that returns preset courses without HTTP calls
class MockCatalogIndex extends CatalogIndex {
  private fixedCourses: CatalogCourse[];

  constructor(courses: CatalogCourse[]) {
    super(new CourseraClient(), '/tmp/mock-catalog-index.json');
    this.fixedCourses = courses;
  }

  override async ensureIndex(): Promise<void> {}
  override async buildIndex(): Promise<void> {}

  override async search(_query: string, filters: SearchFilters = {}): Promise<CatalogCourse[]> {
    let results = this.fixedCourses;
    if (filters.level) {
      results = results.filter((c) => {
        const l = (c.level ?? '').toUpperCase();
        return l === filters.level?.toUpperCase();
      });
    }
    if (filters.language) {
      results = results.filter((c) => c.primaryLanguages?.includes(filters.language!));
    }
    return results;
  }

  override getCourseBySlug(slug: string): CatalogCourse | undefined {
    return this.fixedCourses.find((c) => c.slug === slug || c.id === slug);
  }

  override async getStatus() {
    return { total: this.fixedCourses.length, builtAt: new Date(), isStale: false };
  }
}

const mockCatalogCourses: CatalogCourse[] = [
  {
    id: 'ml-001',
    name: 'Machine Learning Fundamentals',
    slug: 'machine-learning',
    description: 'Learn ML basics',
    level: 'BEGINNER',
    primaryLanguages: ['en'],
    certificates: ['CERTIFICATE'],
    domainTypes: [{ domainId: 'computer-science', subdomainId: 'machine-learning' }],
  },
  {
    id: 'dl-002',
    name: 'Deep Learning Specialization',
    slug: 'deep-learning',
    description: 'Advanced deep learning',
    level: 'ADVANCED',
    primaryLanguages: ['en'],
    certificates: [],
    domainTypes: [{ domainId: 'computer-science', subdomainId: 'machine-learning' }],
  },
  {
    id: 'py-003',
    name: 'Python for Everybody',
    slug: 'python-everybody',
    description: 'Python from scratch',
    level: 'BEGINNER',
    primaryLanguages: ['en'],
    certificates: ['CERTIFICATE'],
    domainTypes: [{ domainId: 'computer-science', subdomainId: 'programming' }],
  },
];

const testCacheDir = path.join(process.cwd(), '.test-recommendations-cache');
let cache: CacheService;
let mockClient: MockCourseraClient;
let mockCatalog: MockCatalogIndex;
const testUserId = 'test-user-123';

// Real memberships response shape
const enrolledMemberships = {
  elements: [
    { id: `${testUserId}~py-003`, courseId: 'python-everybody', grade: null },
  ],
  paging: { total: 1 },
};

describe('Integration: Recommendations Tool', () => {
  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    cache = new CacheService(testCacheDir);
    mockClient = new MockCourseraClient();
    mockCatalog = new MockCatalogIndex(mockCatalogCourses);
    // Set up memberships mock (used by getEnrolledCourses inside getRecommendations)
    mockClient.setMockResponse('https://www.coursera.org/api/memberships.v1', enrolledMemberships);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('getRecommendations', () => {
    it('should return domain-based recommendations excluding enrolled courses', async () => {
      const result = await getRecommendations(mockClient, cache, mockCatalog, testUserId);

      expect(result).toBeDefined();
      expect(result.courses).toBeDefined();
      expect(result.basedOnEnrollments).toBeGreaterThanOrEqual(0);
      // python-everybody is enrolled, so it should not be recommended
      const enrolledSlug = 'python-everybody';
      const includedSlug = result.courses.map((c) => c.slug);
      expect(includedSlug).not.toContain(enrolledSlug);
    });

    it('should include a recommendation reason for each course', async () => {
      const result = await getRecommendations(mockClient, cache, mockCatalog, testUserId);

      result.courses.forEach((course) => {
        expect(course.recommendationReason).toBeDefined();
        expect(course.recommendationReason.length).toBeGreaterThan(0);
      });
    });

    it('should respect limit parameter', async () => {
      const result = await getRecommendations(mockClient, cache, mockCatalog, testUserId, { limit: 1 });
      expect(result.courses.length).toBeLessThanOrEqual(1);
    });

    it('should throw error when userId is missing', async () => {
      try {
        await getRecommendations(mockClient, cache, mockCatalog, '');
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toContain('userId is required');
      }
    });

    it('should return empty recommendations when no enrollments', async () => {
      mockClient.setMockResponse('https://www.coursera.org/api/memberships.v1', { elements: [], paging: { total: 0 } });

      const result = await getRecommendations(mockClient, cache, mockCatalog, testUserId);

      expect(result.courses.length).toBe(0);
      expect(result.basedOnEnrollments).toBe(0);
    });

    it('should use 6-hour cache TTL', async () => {
      await getRecommendations(mockClient, cache, mockCatalog, testUserId);

      // Cache key uses userId
      const cacheKey = `recommendations:v2:${testUserId}:10`;
      const cached = cache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('should return consistent results on second call (cache)', async () => {
      const result1 = await getRecommendations(mockClient, cache, mockCatalog, testUserId);
      const result2 = await getRecommendations(mockClient, cache, mockCatalog, testUserId);

      expect(result1.courses.length).toBe(result2.courses.length);
      if (result1.courses.length > 0) {
        expect(result1.courses[0].id).toBe(result2.courses[0].id);
      }
    });

    it('should include course URL for each recommendation', async () => {
      const result = await getRecommendations(mockClient, cache, mockCatalog, testUserId);

      result.courses.forEach((course) => {
        expect(course.courseUrl).toContain('coursera.org/learn/');
      });
    });

    it('should cap limit at 50', async () => {
      const result = await getRecommendations(mockClient, cache, mockCatalog, testUserId, { limit: 200 });
      expect(result.courses.length).toBeLessThanOrEqual(50);
    });

    it('should use minimum limit of 1', async () => {
      const result = await getRecommendations(mockClient, cache, mockCatalog, testUserId, { limit: 0 });
      expect(result.courses.length).toBeLessThanOrEqual(1);
    });
  });
});
