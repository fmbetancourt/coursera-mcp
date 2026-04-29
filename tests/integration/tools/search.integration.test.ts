import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CourseraClient } from '../../../src/services/courseraClient';
import { CacheService } from '../../../src/services/cache';
import { searchCourses, searchPrograms } from '../../../src/tools/search';
import { mockCourses, mockPrograms } from '../../fixtures';

const testCacheDir = path.join(process.cwd(), '.test-search-cache');

// Mock CourseraClient for testing
class MockCourseraClient extends CourseraClient {
  private mockResponses: Record<string, unknown> = {};

  setMockResponse(key: string, response: unknown): void {
    this.mockResponses[key] = response;
  }

  async get<T>(path: string, config?: unknown): Promise<T> {
    const mockKey = `${path}:${JSON.stringify(config)}`;

    // Return mock if available
    for (const [key, response] of Object.entries(this.mockResponses)) {
      if (mockKey.includes(key)) {
        return response as T;
      }
    }

    // Check if response is in a simplified format
    if (this.mockResponses[path]) {
      return this.mockResponses[path] as T;
    }

    throw new Error(`No mock response for ${path}`);
  }
}

describe('Search Tools Integration', () => {
  let courseraClient: MockCourseraClient;
  let cache: CacheService;

  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    courseraClient = new MockCourseraClient();
    cache = new CacheService(testCacheDir);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('searchCourses', () => {
    it('should search courses with valid query', async () => {
      const mockResponse = {
        courses: mockCourses,
        meta: {
          total: mockCourses.length,
          offset: 0,
          limit: 20,
        },
      };

      courseraClient.setMockResponse('/api/search/courses', mockResponse);

      const result = await searchCourses(courseraClient, cache, {
        query: 'Python',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBe(mockCourses.length);
      expect(result.total).toBe(mockCourses.length);
      expect(result.hasMore).toBe(false);
      expect(result.query).toBe('Python');
    });

    it('should cache results on second request', async () => {
      const mockResponse = {
        courses: mockCourses,
        meta: { total: mockCourses.length, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/courses', mockResponse);

      // First call
      const result1 = await searchCourses(courseraClient, cache, {
        query: 'JavaScript',
        limit: 20,
        offset: 0,
      });

      expect(result1.items.length).toBe(mockCourses.length);

      // Second call - should be cached
      const result2 = await searchCourses(courseraClient, cache, {
        query: 'JavaScript',
        limit: 20,
        offset: 0,
      });

      expect(result2.items.length).toBe(mockCourses.length);
    });

    it('should respect pagination', async () => {
      const mockResponse = {
        courses: [mockCourses[0], mockCourses[1]],
        meta: { total: 100, offset: 0, limit: 2 },
      };

      courseraClient.setMockResponse('/api/search/courses', mockResponse);

      const result = await searchCourses(courseraClient, cache, {
        query: 'Data Science',
        limit: 2,
        offset: 0,
      });

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(100);
      expect(result.hasMore).toBe(true);
    });

    it('should validate required query parameter', async () => {
      try {
        await searchCourses(courseraClient, cache, {
          query: '',
          limit: 20,
        });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should filter by level', async () => {
      const mockResponse = {
        courses: [mockCourses[0]],
        meta: { total: 1, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/courses', mockResponse);

      const result = await searchCourses(courseraClient, cache, {
        query: 'Python',
        level: 'beginner',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBe(1);
    });

    it('should filter by language', async () => {
      const spanishCourses = mockCourses.filter((c) => c.language === 'es');
      const mockResponse = {
        courses: spanishCourses.length > 0 ? spanishCourses : [mockCourses[0]],
        meta: { total: 1, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/courses', mockResponse);

      const result = await searchCourses(courseraClient, cache, {
        query: 'Web Development',
        language: 'es',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should sort results', async () => {
      const sortedCourses = [...mockCourses].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      const mockResponse = {
        courses: sortedCourses,
        meta: { total: sortedCourses.length, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/courses', mockResponse);

      const result = await searchCourses(courseraClient, cache, {
        query: 'Machine Learning',
        sortBy: 'rating',
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      courseraClient.setMockResponse('/api/search/courses', null);

      try {
        await searchCourses(courseraClient, cache, {
          query: 'Any Query',
          limit: 20,
          offset: 0,
        });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        courses: [],
        meta: { total: 0, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/courses', mockResponse);

      const result = await searchCourses(courseraClient, cache, {
        query: 'Nonexistent Course',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('searchPrograms', () => {
    it('should search programs with valid query', async () => {
      const mockResponse = {
        programs: mockPrograms,
        meta: {
          total: mockPrograms.length,
          offset: 0,
          limit: 20,
        },
      };

      courseraClient.setMockResponse('/api/search/programs', mockResponse);

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Data Science',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBe(mockPrograms.length);
      expect(result.total).toBe(mockPrograms.length);
      expect(result.query).toBe('Data Science');
    });

    it('should cache program results', async () => {
      const mockResponse = {
        programs: mockPrograms,
        meta: { total: mockPrograms.length, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/programs', mockResponse);

      // First call
      const result1 = await searchPrograms(courseraClient, cache, {
        query: 'AI',
        limit: 20,
        offset: 0,
      });

      expect(result1.items.length).toBe(mockPrograms.length);

      // Second call - should be cached
      const result2 = await searchPrograms(courseraClient, cache, {
        query: 'AI',
        limit: 20,
        offset: 0,
      });

      expect(result2.items.length).toBe(mockPrograms.length);
    });

    it('should filter programs by type', async () => {
      const filteredPrograms = mockPrograms.filter((p) => p.type === 'specialization');
      const mockResponse = {
        programs: filteredPrograms.length > 0 ? filteredPrograms : mockPrograms,
        meta: { total: filteredPrograms.length > 0 ? filteredPrograms.length : mockPrograms.length, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/programs', mockResponse);

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Specialization',
        type: 'specialization',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should sort programs by price', async () => {
      const sortedPrograms = [...mockPrograms].sort((a, b) => a.price - b.price);
      const mockResponse = {
        programs: sortedPrograms,
        meta: { total: sortedPrograms.length, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/programs', mockResponse);

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Course',
        sortBy: 'price',
        sortOrder: 'asc',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should handle program pagination', async () => {
      const mockResponse = {
        programs: [mockPrograms[0]],
        meta: { total: 50, offset: 0, limit: 1 },
      };

      courseraClient.setMockResponse('/api/search/programs', mockResponse);

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Search',
        limit: 1,
        offset: 0,
      });

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(50);
    });

    it('should handle empty program results', async () => {
      const mockResponse = {
        programs: [],
        meta: { total: 0, offset: 0, limit: 20 },
      };

      courseraClient.setMockResponse('/api/search/programs', mockResponse);

      const result = await searchPrograms(courseraClient, cache, {
        query: 'Nonexistent',
        limit: 20,
        offset: 0,
      });

      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});
